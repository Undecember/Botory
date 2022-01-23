mkdir -p logs
chown undec:undec logs
timecode=$(date +%Y.%m.%d-%H.%M.%S)
node . > logs/$timecode.log 2> logs/$timecode.error.log
