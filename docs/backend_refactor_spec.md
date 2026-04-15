# Backend Refactor Spec

## Goal
Refactor the delivery domain model to better reflect real business operations.

## Current problem
The current schema models requests and projects too tightly:
- projects.request_id is unique, implying 1 request -> 1 project
- but in reality, 1 project is a long-lived codebase/service/repository
- many requests can belong to the same project over time

The current schema also lacks:
- project_events for project/request timeline
- request-level assignments for evaluating developer effort and complexity
- FE/BE complexity profiles tied to actual assignment work

## New target model

### Project
A project is a long-lived codebase / service / repository.

### Request
A request is a business demand / feature / bug / campaign item that belongs to one project.

### Relationship
- 1 project has many requests
- 1 request belongs to 1 project

### New/updated entities

1. projects
- keep existing core fields
- treat repo_url as the main repository reference for now

2. requests
- add project_id as nullable first, then support relation to project
- remove the old 1:1 assumption

3. project_events (new)
Store timeline/history of project and request events.

Suggested fields:
- id
- project_id
- request_id nullable
- event_type
- event_title
- event_description nullable
- event_at
- actor_user_id nullable
- source_type nullable
- metadata_json nullable
- created_at
- updated_at

Examples:
- design_received
- prd_received
- estimate_done
- development_started
- uat_sent
- live
- incident_opened
- scope_changed

4. request_assignments (new)
Track actual work ownership and evaluation per request.

Suggested fields:
- id
- request_id
- project_id
- member_id
- role_type
- planned_md
- actual_md
- start_date nullable
- end_date nullable
- status nullable
- note nullable
- created_at
- updated_at

5. request_assignment_fe_profiles (new)
Linked 1:1 to request_assignments for frontend complexity.

Fields:
- assignment_id
- screens_views
- layout_complexity
- component_reuse
- responsive
- animation_level
- user_actions
- user_actions_list
- api_complexity
- client_side_logic
- heavy_assets
- ui_clarity
- spec_change_risk
- device_support
- timeline_pressure
- note

6. request_assignment_be_profiles (new)
Linked 1:1 to request_assignments for backend complexity.

Fields:
- assignment_id
- user_actions
- business_logic_complexity
- db_tables
- apis
- requirement_clarity
- change_frequency
- realtime
- timeline_pressure
- note

7. Optional git reference support
Create request_assignment_git_refs if needed:
- id
- assignment_id
- repo_url
- branch_name
- pr_url
- commit_hash
- merged_at nullable
- note nullable

## Important rules
- Keep auth, JWT, RBAC, users, roles, permissions working
- Update Prisma schema and migrations carefully
- Update all affected backend modules, DTOs, services, and controllers
- Preserve working endpoints where possible
- If endpoints change, document them clearly