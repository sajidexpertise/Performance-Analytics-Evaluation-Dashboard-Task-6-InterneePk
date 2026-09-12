-- Task 6: Monthly performance extraction for supervisor reporting.
-- Run with SQLite against data/intern_performance.db.
SELECT
    month,
    COUNT(*) AS tasks_assigned,
    SUM(CASE WHEN completed_date IS NOT NULL THEN 1 ELSE 0 END) AS tasks_completed,
    ROUND(100.0 * SUM(CASE WHEN completed_date IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS completion_rate,
    ROUND(AVG(CASE WHEN completed_date IS NOT NULL THEN completion_days END), 2) AS avg_completion_days,
    ROUND(AVG(CASE WHEN completed_date IS NOT NULL THEN project_quality END), 2) AS avg_project_quality,
    ROUND(AVG(CASE WHEN completed_date IS NOT NULL THEN mentor_feedback END), 2) AS avg_mentor_feedback,
    ROUND(100.0 * AVG(CASE WHEN completed_date IS NOT NULL THEN on_time END), 1) AS on_time_rate
FROM performance_tasks
GROUP BY month
ORDER BY month;
