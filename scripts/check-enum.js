const { Client } = require('pg');
const client = new Client({ host:'localhost', port:5432, user:'postgres', password:'Madagasikara', database:'result_db' });
client.connect()
  .then(() => client.query("SELECT enum_range(null::result_status_enum);"))
  .then(r => { console.log(r.rows[0].enum_range); client.end(); })
  .catch(e => { console.error(e.message); client.end(); });
