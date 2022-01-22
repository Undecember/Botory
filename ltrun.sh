mkdir -p ltlogs
chown undec:undec ltlogs
timecode=$(date +%Y.%m.%d-%H.%M.%S)
lt --port 12344 --subdomain undec-lt --print-requests \
> logs/$timecode.log 2> logs/$timecode.error.log
