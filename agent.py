"""
InterviewerOS v2 — Adaptive Technical Interview Agent
Supports: Auto-generated questions from JD OR company-provided custom questions
"""

import json
import re
from dataclasses import dataclass, field, asdict

from typing import Optional
from urllib import response
import anthropic
from openai import OpenAI

DIFFICULTY_MAP = {1: "Foundational", 2: "Proficient", 3: "Expert"}

# ── System Prompt ──────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are InterviewerOS — a world-class Autonomous Adaptive Technical Recruiter deployed by top-tier tech companies.
Your mission: conduct a rigorous, high-signal technical interview, evaluating candidates through intelligent difficulty scaling and deep competency analysis.

## PERSONA
- Senior technical interviewer with 15+ years of hiring experience at FAANG-level companies.
- Warm but rigorous. You hold candidates to high standards but create a psychologically safe environment.
- Ask ONE focused question per turn — never stack multiple questions.
- Never reveal internal scores or difficulty levels to the candidate.
- Never lead the candidate. If truly stuck (no answer after deep thought), offer ONE small hint and flag it internally.

## STATE OBJECT (you maintain and update this every turn)
{
  "current_competency": "string — the topic being assessed now",
  "current_question_index": int — index into the question queue (0-based),
  "difficulty_level": 1|2|3,  // 1=Foundational, 2=Proficient, 3=Expert
  "competency_scores": {},     // { "topic": { "score": 1-10, "notes": "brief eval note" } }
  "session_phase": "INIT|INTERVIEW|WRAPUP",
  "questions_asked": int,
  "hint_given": bool
}

## ADAPTIVE ENGINE (apply every INTERVIEW turn)
- Score > 8 AND level < 3  → Increment level. Ask an architectural, system-design, or edge-case follow-up on the SAME competency before moving on.
- Score < 4 AND level > 1  → Decrement level. Probe a more foundational concept to find the candidate's floor.
- Score 5-7               → Maintain level. Move to the next question in the queue.
- After all questions are asked OR questions_asked >= max_questions → transition to WRAPUP.

## QUESTION MODES
You will be told whether to use AUTO or CUSTOM mode.
- AUTO: Generate questions yourself based on the JD competencies, starting at Medium difficulty.
- CUSTOM: Use the provided question list in order. You may add follow-ups based on the adaptive engine, but always return to the queue.

## FOLLOW-UP LOGIC
After any answer, if the candidate mentions a specific technology, architecture pattern, or project not in the original scope, generate ONE targeted follow-up before returning to the queue. Flag this in internal_monologue.

## SCORING RUBRIC (use this consistently)
9-10: Exceptional — architectural thinking, edge cases, proactive trade-off analysis
7-8:  Strong — correct answer with good depth, minor gaps
5-6:  Adequate — mostly correct, lacks depth or misses important nuances  
3-4:  Weak — partial understanding, significant gaps
1-2:  Poor — fundamental misunderstanding or unable to answer
0:    No answer / skipped

## WRAPUP REPORT FORMAT
When is_complete=true, interviewer_speech must contain a structured report:

INTERVIEW SUMMARY
Candidate: [name]  |  Role: [role]  |  Questions: [N]

COMPETENCY SCORES
• [Competency]: [score]/10 — [1-sentence evaluation]
(repeat for each)

OVERALL ASSESSMENT: [score]/10
RECOMMENDATION: STRONG HIRE | HIRE | CONSIDER | NO HIRE

STRENGTHS: [2-3 bullet points]
DEVELOPMENT AREAS: [2-3 bullet points]

DETAILED NOTES
[Per-competency notes with specific answer highlights]

## STRICT JSON OUTPUT (no markdown, no extra text, valid JSON only)
{
  "interviewer_speech": "string — what the TTS reads to the candidate",
  "internal_monologue": "string — your private reasoning (score rationale, difficulty decision, what to ask next)",
  "current_level": "Foundational|Proficient|Expert",
  "score_this_turn": integer 1-10 or null,
  "hint_given": boolean,
  "is_complete": boolean,
  "updated_state": {
    "current_competency": "string",
    "current_question_index": integer,
    "difficulty_level": integer,
    "competency_scores": { "topic": { "score": integer, "notes": "string" } },
    "session_phase": "INIT|INTERVIEW|WRAPUP",
    "questions_asked": integer,
    "hint_given": boolean
  }
}
"""


# ── State ──────────────────────────────────────────────────────────────────────

@dataclass
class AgentState:
    current_competency: str = ""
    current_question_index: int = 0
    difficulty_level: int = 2
    competency_scores: dict = field(default_factory=dict)
    session_phase: str = "INIT"
    questions_asked: int = 0
    hint_given: bool = False

    def to_dict(self):
        return asdict(self)


# ── Agent ──────────────────────────────────────────────────────────────────────

class InterviewerOS:
    def __init__(self, api_key: str):
        self.client = OpenAI(base_url="https://openrouter.ai/api/v1",api_key=api_key,)
        self.state = AgentState()
        self.conversation: list[dict] = []
        self.company_name: str = ""
        self.role_title: str = ""
        self.candidate_name: str = ""
        self.question_mode: str = "AUTO"        # "AUTO" or "CUSTOM"
        self.custom_questions: list[str] = []   # company-provided questions
        self.max_questions: int = 10
        self.jd: str = ""

    # ── Bootstrap ──────────────────────────────────────────────────────────────

    def bootstrap(
        self,
        job_description: str,
        candidate_name: str = "Candidate",
        company_name: str = "",
        role_title: str = "",
        custom_questions: list[str] | None = None,
        max_questions: int = 10,
    ) -> dict:
        """Parse JD, set up question queue, return opening question."""
        self.state = AgentState()
        self.conversation = []
        self.jd = job_description
        self.candidate_name = candidate_name
        self.company_name = company_name
        self.role_title = role_title
        self.max_questions = max_questions

        if custom_questions and len(custom_questions) > 0:
            self.question_mode = "CUSTOM"
            self.custom_questions = [q.strip() for q in custom_questions if q.strip()]
            self.max_questions = max(len(self.custom_questions) + 3, max_questions)
        else:
            self.question_mode = "AUTO"
            self.custom_questions = []

        bootstrap_prompt = self._build_bootstrap_prompt()
        return self._call_claude(bootstrap_prompt)

    def _build_bootstrap_prompt(self) -> str:
        mode_section = ""
        if self.question_mode == "CUSTOM":
            q_list = "\n".join(
                f"{i+1}. {q}" for i, q in enumerate(self.custom_questions)
            )
            mode_section = f"""
## QUESTION MODE: CUSTOM
The company has provided {len(self.custom_questions)} questions. Use them in order.
You may add adaptive follow-ups based on answers, but always return to this queue.

QUESTION QUEUE:
{q_list}
"""
        else:
            mode_section = """
## QUESTION MODE: AUTO
Generate questions yourself based on the competencies you extract from the JD.
Start at difficulty level 2 (Proficient). Apply the adaptive engine as the interview progresses.
"""

        return f"""
You are starting a new interview session. Parse everything below and begin the interview.

## SESSION CONTEXT
Company: {self.company_name or "Not specified"}
Role: {self.role_title or "Not specified"}
Candidate: {self.candidate_name}
Max Questions: {self.max_questions}

## JOB DESCRIPTION
{self.jd}

{mode_section}

## YOUR TASKS
1. Parse the JD to identify 4-6 core technical competencies.
2. Initialize state: session_phase=INTERVIEW, difficulty_level=2, questions_asked=0.
3. Pre-populate competency_scores keys with score=0.
4. Greet the candidate warmly and professionally — mention {self.company_name or "the company"} and the role.
5. Ask the FIRST question (question 1 from the queue if CUSTOM, or your best opening question if AUTO).
6. Keep the greeting + first question concise and professional.

Return strict JSON per the output schema.
"""

    # ── Process Answer ──────────────────────────────────────────────────────────

    def process_answer(self, candidate_answer: str) -> dict:
        self.state.questions_asked += 1

        next_q_section = ""
        if self.question_mode == "CUSTOM":
            next_idx = self.state.current_question_index + 1
            remaining = self.custom_questions[next_idx:next_idx + 3]
            next_q_section = f"""
## UPCOMING QUESTIONS (from company queue)
Current index: {self.state.current_question_index}
Next questions: {json.dumps(remaining)}
Total in queue: {len(self.custom_questions)}
"""

        prompt = f"""
## CURRENT STATE
{json.dumps(self.state.to_dict(), indent=2)}

## SESSION CONFIG
Mode: {self.question_mode}
Candidate: {self.candidate_name}
Role: {self.role_title}
Questions asked: {self.state.questions_asked} / {self.max_questions}

{next_q_section}

## CANDIDATE'S ANSWER
"{candidate_answer}"

## YOUR TASKS
1. Score this answer using the rubric (1-10). Write your reasoning in internal_monologue.
2. Apply the Adaptive Engine logic.
3. Decide: follow-up on this answer, or advance to next question?
4. If questions_asked >= {self.max_questions} OR all competencies fully assessed → WRAPUP.
5. If WRAPUP: set is_complete=true and write the full structured report in interviewer_speech.
6. Otherwise: ask the next question naturally and professionally.
7. Update updated_state fully.

Return strict JSON per the output schema.
"""
        result = self._call_claude(prompt)

        # Sync local state
        if us := result.get("updated_state"):
            self.state.current_competency    = us.get("current_competency", self.state.current_competency)
            self.state.current_question_index = us.get("current_question_index", self.state.current_question_index)
            self.state.difficulty_level       = us.get("difficulty_level", self.state.difficulty_level)
            self.state.competency_scores      = us.get("competency_scores", self.state.competency_scores)
            self.state.session_phase          = us.get("session_phase", self.state.session_phase)
            self.state.questions_asked        = us.get("questions_asked", self.state.questions_asked)
            self.state.hint_given             = us.get("hint_given", False)

        return result

    # ── Validate Custom Questions ──────────────────────────────────────────────

    def validate_questions(self, questions: list[str], job_description: str) -> dict:
        """Ask Claude to review company questions for relevance and quality."""
        prompt = f"""
You are reviewing a set of technical interview questions for relevance and quality.

JOB DESCRIPTION:
{job_description}

QUESTIONS TO REVIEW:
{json.dumps(questions, indent=2)}

For each question, provide:
1. relevance_score (1-10)
2. difficulty_estimate ("Foundational"|"Proficient"|"Expert")
3. competency_tag (which skill does it test)
4. suggestion (optional improvement)

Return ONLY valid JSON:
{{
  "overall_quality": integer 1-10,
  "reviews": [
    {{
      "question": "original question text",
      "relevance_score": integer,
      "difficulty_estimate": "string",
      "competency_tag": "string",
      "suggestion": "string or null"
    }}
  ],
  "missing_competencies": ["list of important JD skills not covered"]
}}
"""
        response = self.client.chat.completions.create(
    model="anthropic/claude-sonnet-4-5",
    max_tokens=1500,
    messages=[
        {"role": "system", "content": "You are a senior technical recruiter. Return only valid JSON."},
        {"role": "user", "content": prompt}
    ],
)
        return self._safe_parse(response.choices[0].message.content)
    # ── Internal LLM Call ──────────────────────────────────────────────────────

    def _call_claude(self, user_message: str) -> dict:
        self.conversation.append({"role": "user", "content": user_message})
        response = self.client.chat.completions.create(
            model="anthropic/claude-sonnet-4-5",   # or any OpenRouter model
            max_tokens=2000,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + self.conversation,
        )
        raw = response.choices[0].message.content
        self.conversation.append({"role": "assistant", "content": raw})
        return self._safe_parse(raw)

    @staticmethod
    def _safe_parse(text: str) -> dict:
        clean = re.sub(r"```(?:json)?|```", "", text).strip()
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            return {
                "interviewer_speech": "I had a moment of technical difficulty. Could you please repeat your answer?",
                "internal_monologue": f"[PARSE ERROR] Raw: {text[:300]}",
                "current_level": "Proficient",
                "score_this_turn": None,
                "hint_given": False,
                "is_complete": False,
                "updated_state": {},
            }

    def get_session_summary(self) -> dict:
        scores = {}
        for topic, data in self.state.competency_scores.items():
            if isinstance(data, dict):
                scores[topic] = data
            else:
                scores[topic] = {"score": data, "notes": ""}
        return {
            "candidate_name": self.candidate_name,
            "role_title": self.role_title,
            "company_name": self.company_name,
            "competency_scores": scores,
            "questions_asked": self.state.questions_asked,
            "final_difficulty": DIFFICULTY_MAP.get(self.state.difficulty_level, "Proficient"),
            "question_mode": self.question_mode,
        }
