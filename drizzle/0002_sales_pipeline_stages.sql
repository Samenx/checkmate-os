UPDATE deals
SET status = CASE status
  WHEN 'Qualified' THEN 'Qualification'
  WHEN 'Initial Contact' THEN 'Needs Analysis'
  WHEN 'Meeting Scheduled' THEN 'Value Proposition'
  WHEN 'Needs Identified' THEN 'Identify Decision Makers'
  WHEN 'Proposal Preparation' THEN 'Proposal/Price Quote'
  WHEN 'Proposal Sent' THEN 'Proposal/Price Quote'
  WHEN 'Negotiation' THEN 'Negotiation/Review'
  WHEN 'Verbal Agreement' THEN 'Negotiation/Review'
  ELSE status
END;
--> statement-breakpoint
CREATE TEMP TABLE pipeline_workspaces AS SELECT DISTINCT workspace FROM stages;
--> statement-breakpoint
DELETE FROM stages;
--> statement-breakpoint
INSERT INTO stages (id, workspace, name, status, created_at, updated_at, probability, position, color)
SELECT lower(hex(randomblob(16))), workspace, name, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, probability, position, color
FROM pipeline_workspaces
CROSS JOIN (
  SELECT 'Qualification' AS name, 10 AS probability, 0 AS position, '#6366f1' AS color
  UNION ALL SELECT 'Needs Analysis', 20, 1, '#38bdf8'
  UNION ALL SELECT 'Value Proposition', 40, 2, '#a78bfa'
  UNION ALL SELECT 'Identify Decision Makers', 60, 3, '#d4af37'
  UNION ALL SELECT 'Proposal/Price Quote', 75, 4, '#22c55e'
  UNION ALL SELECT 'Negotiation/Review', 90, 5, '#22c55e'
  UNION ALL SELECT 'Closed Won', 100, 6, '#22c55e'
  UNION ALL SELECT 'Closed Lost', 0, 7, '#ef4444'
);
--> statement-breakpoint
DROP TABLE pipeline_workspaces;
