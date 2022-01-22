WD := $(shell pwd)
bin := $(shell which node | rev | cut -c 6- | rev)

service:
	sudo cp *.service /etc/systemd/system/
	sudo sed -i 's#BIN_PATH#$(bin)#' /etc/systemd/system/botory.service
	sudo sed -i 's#BOTORY_PATH#$(WD)#' /etc/systemd/system/botory.service
	sudo sed -i 's#BIN_PATH#$(bin)#' /etc/systemd/system/localtunnel.service
	sudo sed -i 's#BOTORY_PATH#$(WD)#' /etc/systemd/system/localtunnel.service
	sudo systemctl enable botory
	sudo systemctl enable localtunnel
	sudo systemctl daemon-reload

localtunnel:
	npm i -g localtunnel
