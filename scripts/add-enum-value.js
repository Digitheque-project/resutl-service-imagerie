const { Client } = require('pg');
const client = new Client({ host:'localhost', port:5432, user:'postgres', password:'Madagasikara', database:'result_db' });
client.connect()
  .then(() => client.query("ALTER TYPE result_status_enum ADD VALUE IF NOT EXISTS 'VALIDATED';"))
  .then(() => { console.log('OK'); client.end(); })
  .catch(e => { console.error(e.message); client.end(); });
