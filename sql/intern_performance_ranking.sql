-- Composite monthly intern ranking aligned with the dashboard KPI definitions.
WITH base AS (
  SELECT
    month, intern_id, intern_name, department,
    COUNT(*) AS assigned,
    SUM(CASE WHEN completed_date IS NOT NULL THEN 1 ELSE 0 END) AS completed,
    AVG(CASE WHEN completed_date IS NOT NULL THEN project_quality END) AS quality,
    AVG(CASE WHEN completed_date IS NOT NULL THEN mentor_feedback END) AS feedback,
    AVG(CASE WHEN completed_date IS NOT NULL THEN on_time END) AS on_time
  FROM performance_tasks
  GROUP BY month, intern_id, intern_name, department
)
SELECT
  month, intern_id, intern_name, department, assigned, completed,
  ROUND(100.0 * completed / assigned, 1) AS completion_rate,
  ROUND(quality, 2) AS avg_quality,
  ROUND(feedback, 2) AS avg_feedback,
  ROUND(
    0.35 * (100.0 * completed / assigned) +
    0.30 * (20.0 * COALESCE(quality, 0)) +
    0.25 * (20.0 * COALESCE(feedback, 0)) +
    0.10 * (100.0 * COALESCE(on_time, 0)), 1
  ) AS performance_score
FROM base
ORDER BY month, performance_score DESC;
