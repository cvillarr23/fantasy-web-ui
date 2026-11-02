---
title: Jobs
description: Start, cancel and pause catalog jobs, follow their runs and watch a chain step by step.
sidebar_position: 11.5
---

Route: `/jobs`. Add `?job=<name>` to open with a job selected.

## What does it show?

| Area | Shows |
|---|---|
| Header pills | How many jobs there are, how many are running or queued, how many failed their last run, and the launcher heartbeat |
| All jobs | Each job's schedule or trigger, last run, next slot, and Run and Cancel buttons |
| Selected job | Parameters, **With downstream**, the state of a run you started, its pause, and recent runs |
| Chain panel | The latest run of each chain, step by step, updating while it runs, with the chain's pause. Phones show a list instead of the graph |

**Affects team** marks a job that can change your team on ESPN or stage moves for your approval. **Paused** marks a job whose scheduled runs are paused.

A solid line in a chain graph waits for the step before it to succeed. A dashed line runs once that step finishes, whatever the result.

## How do I start a job?

- **Run** starts a job with nothing to choose straight away.
- **Run…** opens the job in the side panel when it has parameters, affects your team or is a chain step.
- **With downstream** also runs the steps after this one in its chain. Parameters apply to the first step only, so a dry run doesn't cover later steps.

A run that can affect your team, including through a later step, asks you to confirm first.

:::note
**Queued** means the launcher accepted the run, not that it finished. Follow **Watch this run** to see how it ends.
:::

## How do I stop a run?

**Cancel** appears wherever a run is queued or running: on the job's row, on a chain step, and in the side panel when a one-at-a-time job is blocked. **Cancel chain run** on the chain panel stops the whole chain run: its queued and running steps are cancelled, and later steps don't start.

Cancelling asks you to confirm. The launcher then stops the run's pod or process. Anything the run already changed stays changed.

## How do I pause a job or chain?

**Pause…** in the side panel pauses a job, and **Pause chain…** on the chain panel pauses a chain. Choose how long, from an hour to until you resume it, and give a reason, such as a bye week.

While paused, each scheduled slot is recorded as a **Skipped** run with the reason **paused**, so recent runs show the slots you missed. A paused job is also skipped as a step of its chain. Starting a job from this page still works.

The pause shows who set it, why, and when it ends. **Resume** ends it early. A pause with an end time lifts by itself.

## What does "Run not started" mean?

Core refused the run. Most often the job allows one run at a time and one is already active, and the message links that run. For any other refusal it shows the API's reason.

## Why is a next slot blank or paused?

| Next slot | Means |
|---|---|
| A time | The job's next scheduled slot, in your local time |
| `With <chain>` | The job has no schedule of its own and runs with that chain |
| `Paused until…` | A pause replaces the slot. Manual runs still start. See [How do I pause a job or chain?](#how-do-i-pause-a-job-or-chain) |
| — | Nothing is scheduled. For a season-bound chain, that can mean the next season's NFL schedule isn't published yet |

## What's on a run's page?

Runs open at `/activity/runs/<id>`. Launcher runs show:

| Section | Shows |
|---|---|
| Status timeline | The scheduled slot, the start of the latest attempt and how the run ended |
| Facts | Trigger, who requested it, parameters and where it ran |
| Log | The captured log tail, with **Open in Grafana** and **Show Grafana logs here** for pod runs when Grafana is configured |
| Child runs | Runs this one led to, with links to any LLM sessions |

The Grafana panel needs you to be signed in to Grafana already, because Google sign-in won't load inside a panel.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/jobs` | Catalog jobs and chains, with last runs, next slots and pauses |
| `POST /v1/jobs/<name>/runs` | Start a run |
| `POST /v1/runs/<id>/cancel` | Cancel a queued or running run, or a whole chain run |
| `PUT /v1/jobs/<name>/pause` | Pause a job or chain, with an optional end time and a reason |
| `DELETE /v1/jobs/<name>/pause` | Resume a job or chain |
| `GET /v1/launcher/health` | Launcher heartbeat |
| `GET /v1/activity/runs?job=<name>` | Recent runs of a job, and a chain's latest run |
| `GET /v1/activity/runs/<id>` | One run with its child runs |
| `GET /ui-config.json` | Deployment settings served by nginx |
