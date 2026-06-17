BrainVerge V1 – Product Specification
Project Overview

BrainVerge is a local-first personal growth operating system designed to help a user track, nurture, and measure the growth of their skills, projects, academic pursuits, ideas, interests, and personal development areas over long periods of time.

Unlike traditional note-taking applications, task managers, or habit trackers, BrainVerge treats every area of interest as a living entity that grows or declines based on the user's consistency, commitment, and self-reported confidence.

The application's core philosophy is:

"Anything can become expertise if consistently nurtured over time."

BrainVerge visualizes this concept through a plant-growth system where interests begin as seeds, grow into plants, and eventually become strong trees representing mastery. Neglected interests gradually wilt and can eventually be archived or marked abandoned.

The application must work completely offline and store all data locally.

No cloud services are required.

No AI APIs are required.

All intelligence is derived from user activity, statistics, and rule-based insights.

Core Goal

BrainVerge should answer the following questions at any time:

What am I currently pursuing?
Which interests are growing?
Which interests are stagnating?
What have I abandoned?
How consistent am I?
Where am I investing most of my time?
Which skills am I becoming confident in?
What long-term progress have I made?
Application Type

Local web application.

Recommended stack:

Frontend:

React
TypeScript
TailwindCSS

Backend:

FastAPI (Python)

Database:

SQLite

File Storage:

Local filesystem

Application should be easy to run on a single machine.

Core Data Model

The central object in the system is called a Growth Item.

A Growth Item represents anything the user wants to improve, learn, build, study, or track.

Examples:

Python Programming
Linux Mastery
Networking
Cybersecurity
Final Year Project
Public Speaking
AI Research
Reading Habit
Startup Idea
Growth Item Fields
GrowthItem {
    id: string
    title: string
    description: string

    category: string

    status: Active | Archived | Abandoned

    growthStage:
        Seed |
        Seedling |
        GrowingPlant |
        YoungTree |
        StrongTree |
        AncientTree

    confidenceScore: number
    commitmentScore: number
    growthScore: number

    streakDays: number

    createdAt: datetime
    updatedAt: datetime
    lastActivityAt: datetime

    archivedReason?: string
}
Categories

System should support predefined and custom categories.

Default categories:

Skills
Projects
Academics
Research
Business Ideas
Personal Development
Books
Career
Other
Notes System

Each Growth Item can contain unlimited notes.

A note contains:

Note {
    id
    growthItemId
    title
    content
    createdAt
    updatedAt
}

Capabilities:

Create note
Edit note
Delete note
Search notes
Rich text optional
Markdown support preferred
File Storage System

Each Growth Item can store files.

Supported examples:

PDFs
Images
ZIP files
Documents
Videos
Lab files
Research material

Store files locally.

File metadata:

FileAttachment {
    id
    growthItemId

    fileName
    filePath
    uploadedAt
    fileSize
}
Activity Tracking System

Every meaningful action generates an activity record.

Examples:

Note created
Note edited
File uploaded
Confidence updated
Growth item created

Activity record:

Activity {
    id
    growthItemId

    actionType

    timestamp
}
Daily Streak System

The application should reward meaningful engagement.

Opening the application alone must not increase streaks.

A streak only increases when the user performs at least one meaningful action:

Examples:

Creates note
Updates note
Uploads file
Updates confidence
Writes reflection

If user performs activity today:

streak += 1

If a day is missed:

streak resets

Track:

Current streak
Longest streak
Confidence Tracking

Confidence is self-assessed.

Each Growth Item allows user to rate confidence from:

1 - 10

Questions may include:

How confident are you discussing this topic?

How confident are you applying this skill?

How confident are you teaching this skill?

Average becomes:

confidenceScore

Store historical confidence values.

Allow viewing confidence growth over time.

Commitment Tracking

Commitment is calculated automatically.

Commitment should be derived from:

Number of activity events
Frequency of engagement
Streaks
Notes created
Files uploaded

Example scoring system:

0 - 100

User does not edit this directly.

System calculates it.

Growth Score

Growth Score combines:

Consistency
Commitment
Confidence

Suggested formula:

GrowthScore =
40% Consistency
30% Commitment
30% Confidence

Output:

0 - 100
Plant Growth System

This is the application's signature feature.

Every Growth Item is represented by a plant.

Plant state depends on Growth Score.

Growth Stages
Stage 1
🌱 Seed

Newly created interest.

Stage 2
🌿 Seedling

Early engagement.

Stage 3
🪴 Growing Plant

Consistent engagement.

Stage 4
🌳 Young Tree

Strong progress.

Stage 5
🌲 Strong Tree

Long-term dedication.

Stage 6
🏆 Ancient Tree

Represents mastery.

Neglect / Decay System

The system should visualize neglect.

No activity for:

7 Days

Plant becomes slightly wilted.

🥀

Message:

This interest misses your attention.
30 Days

Heavily wilted.

🥀🥀

Message:

Growth has significantly slowed.
90 Days

Dead plant.

💀🌱

Message:

This interest may have been abandoned.

Options:

Revive
Archive
Delete
Archive System

Instead of deleting immediately.

Allow:

Archive

When archiving ask:

Why are you archiving this?

Suggested reasons:

Goal Achieved
Lost Interest
No Time
Too Difficult
Replaced By Another Interest
No Longer Relevant
Other

Store archive reason.

Allow archived items to be restored.

Activity Timeline

Every Growth Item should display a timeline.

Example:

July 1
Created item

July 2
Added notes

July 5
Uploaded file

July 7
Updated confidence

July 10
Reached Young Tree stage

Purpose:

Help user visualize long-term progress.

Dashboard

The dashboard should provide an immediate overview.

Sections:

Daily Streak

Show:

Current Streak
Longest Streak
Active Growth Items

List currently active items.

Growing Fastest

Show top growth items based on growth score increase.

At Risk

Show items nearing decay thresholds.

Examples:

No activity for 5+ days
Recently Updated

Recent activity feed.

Growth Forest

Visual representation of all active interests.

Example:

🌱 Python
🌿 Linux
🌳 Networking
🥀 Blockchain
🌲 Cybersecurity

This should be the application's centerpiece.

Statistics Dashboard

Provide visual analytics.

Examples:

Activity Heatmap

Daily activity history.

Confidence Trend

Confidence over time.

Growth Progress

Growth stage transitions.

Example:

Seed
→ Seedling
→ Plant
→ Tree
Most Active Categories

Examples:

Skills
Projects
Academics
Time-Based Insights

Generated from rules.

Examples:

Networking has your highest growth rate.

Linux has not been updated in 14 days.

Python currently has the longest streak.

Cybersecurity confidence increased by 15%.

These are not AI-generated.

They are generated using deterministic rules and calculations.

Search

Global search should find:

Growth Items
Notes
File names

Fast local search.

Design Philosophy

The application should feel:

Calm
Motivating
Reflective
Personal
Growth-oriented

Avoid:

Corporate project-management aesthetics
Complex team collaboration features
Social networking features
Cloud dependencies

The user should feel like they are tending a personal forest of knowledge, skills, projects, and ambitions.

Version 1 Constraints

Do NOT implement:

Cloud sync
User accounts
Multi-user support
External AI APIs
Chatbots
Complex task management
Team collaboration

Focus entirely on:

Growth tracking
Notes
Files
Streaks
Confidence
Commitment
Plant growth visualization
Archive system
Timeline/history
Statistics dashboard

The goal of Version 1 is to create a fully offline, visually engaging personal growth tracker that helps transform interests into expertise through consistent nurturing over time.