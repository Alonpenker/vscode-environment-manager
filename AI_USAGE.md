# My Thought Process and AI Usage

> **Note:** This file was not written by an AI.

---

## Introduction:

This process is my go-to workflow for every new feature I work on, using custom Claude skills and agents. The git history currently reflects this process exactly, with a commit to every step.

## Step 0: RESEARCH:

This step usually starts with a freestyle brainstorm with ChatGPT/Codex about what I want to build. This step helps me a lot to understand the main directions and risks and focus my idea. I let it run research for me to find common solutions, recommended technologies, or libraries with their pros and cons. After I feel confident enough about the idea, I move to the next step.

## Step 1: SPEC:

This step loads one of my specialized custom agents (I used the backend-engineer agent) and builds a requirements specification file. Claude defines the functional and non-functional requirements based on my prompt and by asking clarifying questions, edge cases, and assumptions. After I verify the SPEC.md file, I move to the next step.

What I changed in AI output: data schemas, environment variables choices, logs structure, project structure


## Step 2: PLAN

This step converts the SPEC.md file to PLAN.md file.  Claude designs interfaces & contracts, breaks into testable units, and creates a use case checklist that will verify the feature works end-to-end as expected (will be very useful later). After I verify PLAN.md, I move to the next step.

What I changed in AI output: added exception handler, NGINX port, step 0 for intialize project, specific implementation technique for services, hardcoded vs. configurable settings variables

## Step 3: IMPLEMENT

This step is pretty straightforward and doesn’t require a skill file at all. I let Claude implement the code plan according to the testable units and implementation order.

## Step 4: TEST

This step takes the use cases defined in the plan and builds (or modifies) tests for each use case. The important part is to write the tests based on the use cases and not the code logic itself. Claude writes and runs tests, modifies source code if needed (on my approval) until all tests pass.

What I changed in AI output: tests files structure, test documentation (Given/When/Then)

## Step 5: REVIEW

This step leverages the power of Claude and Codex together. Claude calls Codex using a prompt (”Act as an angry, skeptical senior engineer…”) to review the code changes according to the original SPEC.md file. This helps catch missing requirements, incorrect implementations, or bad code overall. I get from Claude a code report and suggestions to fix. This is giving me an easy start to dive deep into the code review myself. Only after I have fully verified and feel confident about the code quality (and tests still pass), I move to the next step.

What I changed in AI output: exception handler, WorkspaceService configuration, resolved warnings

## Step 6: OBSERVE 

This step is where Claude is the most useful. Using the use cases checklist from the PLAN.md, Claude sets up the local environment, sends requests, checks logs, verifies results, and tests the implementation end to end. I get a report for all the checked use cases and verify on my own the left ones (usually browser-based). After all use cases and fixes are done, the feature is ready to ship.

What I changed in AI output: resolved missing use cases, resolved missing documentaion

## Step 7: BONUS

Bonus step to include additional files and features + small changes for better coverage. Including the following:
- React frontend UI dashboard
- Frontend tests pipeline
- This file

What I changed in AI output: NGINX template, splitted .gitignore and .dockerignore