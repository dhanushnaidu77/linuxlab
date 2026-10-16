# live mode: a second copy of the stuck job starts
on app01 'setsid nohup /usr/local/bin/$PROC >/dev/null 2>&1 < /dev/null & sleep 0.3'
