from pathlib import Path
import json
root = Path(__file__).resolve().parent.parent
sql = (root / 'db/migrations/0009_ride_club.sql').read_text(encoding='utf-8')
(root / 'src/lib/rideClubSchema.ts').write_text('// Generated from db/migrations/0009_ride_club.sql; tests enforce equality.\nexport const RIDE_CLUB_SQL = ' + json.dumps(sql) + ';\n', encoding='utf-8')
