#force kill any existing node server running on the port
pkill -9 chrome
pkill -9 node
> server.log
#cd to the directory this file is in
DIRECTORY=$(dirname "$0")
cd "$DIRECTORY"

#Start the node server
nodemon app.js 2>&1 | tee -a server.log
