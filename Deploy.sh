#!/bin/sh

sshpass -p $SFTPPASS -v sftp -v -oStrictHostKeyChecking=no $SFTPUSRN@$SFTPADDR << !
cd $SFTPDEST
put src/index.html
put -R src/api/
put -R src/css/
put -R src/img/
put -R src/js/
put -R src/lib/
cd $SFTPDEST/data
put src/data/class-mapping.json
put src/data/maps.json
bye
!