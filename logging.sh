#!/bin/bash -e

echo "Starting logging ..."
sudo journalctl -u flights2mqtt.service -f

echo "Done!"
