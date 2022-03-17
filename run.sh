mkdir -p logs
chown undec:undec logs
timecode=$(date +%Y.%m.%d-%H.%M.%S)
node . > logs/latest.log 2> logs/latest.error.log
cd logs
mv latest.log $timecode.log
mv latest.error.log $timecode.error.log
xz $timecode.log
xz $timecode.error.log
