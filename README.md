# Uptime Monitoring Application | RESTful API

No Frameworks |
No Depenencies |
Just raw Node.js

An "uptime monitor" allows users to enter URLS they want monitored, and recieve alerts when those resources "go down" or "come back online".

- users can sign up and sign in
- alerts will be revieved via SMS messages
- use OpenSSL for https support
- use zlib to compress log files

## API

- listens on port and accepts HTTP requests for POST, GET, PUT, DELETE, HEAD
- Allow a client to connect and create, edit and delete users
- Allow users to sing in and respond with token based authentication for subsequent requests
- Sign out invalidates token
- Singed in users can create new 'checks' for up and down urls and their definition based on status codes
- Edit and delete 'checks'
- Workers perform 'checks' at appropriate times and alerts users when check state changes
- checks run once per minute
