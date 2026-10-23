CREATE INDEX IF NOT EXISTS allocations_event_inventory ON allocations(workspace, event_id, inventory_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_workspace_due ON tasks(workspace, due_date, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payments_workspace_event ON payments(workspace, event_id, status);
--> statement-breakpoint
CREATE TRIGGER allocation_capacity_insert BEFORE INSERT ON allocations
WHEN NEW.status = 'Reserved'
BEGIN
 SELECT CASE WHEN NEW.quantity < 1 OR NOT EXISTS (SELECT 1 FROM events WHERE id=NEW.event_id AND workspace=NEW.workspace AND due_date IS NOT NULL) OR NOT EXISTS (SELECT 1 FROM inventory WHERE id=NEW.inventory_id AND workspace=NEW.workspace AND status='Good') THEN RAISE(ABORT, 'Invalid equipment reservation') END;
 SELECT CASE WHEN NEW.quantity + COALESCE((SELECT SUM(a.quantity) FROM allocations a JOIN events e ON a.event_id=e.id JOIN events target ON target.id=NEW.event_id WHERE a.inventory_id=NEW.inventory_id AND a.workspace=NEW.workspace AND (a.status IN ('Lost','Damaged') OR (a.status='Reserved' AND e.status!='Cancelled' AND e.due_date<=COALESCE(target.end_date,target.due_date) AND COALESCE(e.end_date,e.due_date)>=target.due_date))),0) > (SELECT quantity FROM inventory WHERE id=NEW.inventory_id) THEN RAISE(ABORT, 'Insufficient equipment for overlapping event') END;
END;
--> statement-breakpoint
CREATE TRIGGER allocation_capacity_update BEFORE UPDATE ON allocations
WHEN NEW.status = 'Reserved'
BEGIN
 SELECT CASE WHEN NEW.quantity < 1 OR NOT EXISTS (SELECT 1 FROM events WHERE id=NEW.event_id AND workspace=NEW.workspace AND due_date IS NOT NULL) OR NOT EXISTS (SELECT 1 FROM inventory WHERE id=NEW.inventory_id AND workspace=NEW.workspace AND status='Good') THEN RAISE(ABORT, 'Invalid equipment reservation') END;
 SELECT CASE WHEN NEW.quantity + COALESCE((SELECT SUM(a.quantity) FROM allocations a JOIN events e ON a.event_id=e.id JOIN events target ON target.id=NEW.event_id WHERE a.id!=NEW.id AND a.inventory_id=NEW.inventory_id AND a.workspace=NEW.workspace AND (a.status IN ('Lost','Damaged') OR (a.status='Reserved' AND e.status!='Cancelled' AND e.due_date<=COALESCE(target.end_date,target.due_date) AND COALESCE(e.end_date,e.due_date)>=target.due_date))),0) > (SELECT quantity FROM inventory WHERE id=NEW.inventory_id) THEN RAISE(ABORT, 'Insufficient equipment for overlapping event') END;
END;
--> statement-breakpoint
CREATE TRIGGER event_reschedule_capacity BEFORE UPDATE OF due_date,end_date,status ON events
WHEN NEW.status != 'Cancelled'
BEGIN
 SELECT CASE WHEN EXISTS (SELECT 1 FROM allocations own JOIN inventory i ON i.id=own.inventory_id WHERE own.event_id=NEW.id AND own.status='Reserved' AND (NEW.due_date IS NULL OR own.quantity+COALESCE((SELECT SUM(other.quantity) FROM allocations other JOIN events e ON other.event_id=e.id WHERE other.id!=own.id AND other.inventory_id=own.inventory_id AND (other.status IN ('Lost','Damaged') OR (other.status='Reserved' AND e.status!='Cancelled' AND e.due_date<=COALESCE(NEW.end_date,NEW.due_date) AND COALESCE(e.end_date,e.due_date)>=NEW.due_date))),0)>i.quantity)) THEN RAISE(ABORT,'Rescheduling conflicts with equipment reservations') END;
END;
--> statement-breakpoint
CREATE TRIGGER payment_positive_insert BEFORE INSERT ON payments
WHEN NEW.value < 0
BEGIN SELECT RAISE(ABORT, 'Payment cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER payment_positive_update BEFORE UPDATE OF value ON payments
WHEN NEW.value < 0
BEGIN SELECT RAISE(ABORT, 'Payment cannot be negative'); END;
