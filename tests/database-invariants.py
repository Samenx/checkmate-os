import sqlite3, pathlib, unittest
class DatabaseInvariants(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.execute('PRAGMA foreign_keys=ON')
  for p in sorted(pathlib.Path('drizzle').glob('*.sql')): self.db.executescript(p.read_text())
  self.db.execute("INSERT INTO inventory(id,workspace,name,status,quantity,created_at,updated_at) VALUES('i','w','Clocks','Good',5,'2026-01-01','2026-01-01')")
  for k,d in [('a','2026-01-01'),('b','2026-01-01'),('c','2026-02-01')]: self.db.execute("INSERT INTO events(id,workspace,name,status,due_date,created_at,updated_at) VALUES(?,'w',?,'Confirmed',?,'2026-01-01','2026-01-01')",(k,k,d))
 def allocation(self,id,event,qty): self.db.execute("INSERT INTO allocations(id,workspace,name,status,event_id,inventory_id,quantity,created_at,updated_at) VALUES(?,'w',?,'Reserved',?,'i',?,'2026-01-01','2026-01-01')",(id,id,event,qty))
 def test_overlap_capacity(self):
  self.allocation('one','a',4)
  with self.assertRaises(sqlite3.IntegrityError): self.allocation('two','b',2)
  self.allocation('two','b',1)
 def test_separate_dates(self):
  self.allocation('one','a',5); self.allocation('two','c',5)
 def test_rescheduling_preserves_capacity(self):
  self.allocation('one','a',5); self.allocation('two','c',5)
  with self.assertRaises(sqlite3.IntegrityError): self.db.execute("UPDATE events SET due_date='2026-01-01' WHERE id='c'")
 def test_return_releases_stock(self):
  self.allocation('one','a',5);self.db.execute("UPDATE allocations SET status='Returned' WHERE id='one'");self.allocation('two','b',5)
 def test_damage_remains_unavailable(self):
  self.allocation('one','a',3);self.db.execute("UPDATE allocations SET status='Damaged' WHERE id='one'")
  with self.assertRaises(sqlite3.IntegrityError):self.allocation('two','c',3)
 def test_payment_protects_event(self):
  self.db.execute("INSERT INTO payments(id,workspace,name,status,event_id,value,created_at,updated_at) VALUES('p','w','Deposit','Received','a',100,'2026-01-01','2026-01-01')")
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("DELETE FROM events WHERE id='a'")
 def test_negative_payment_rejected(self):
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("INSERT INTO payments(id,workspace,name,status,event_id,value,created_at,updated_at) VALUES('p','w','Deposit','Received','a',-100,'2026-01-01','2026-01-01')")
if __name__=='__main__':unittest.main()
