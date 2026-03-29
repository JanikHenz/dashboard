#!/bin/bash
PC_IP="192.168.1.9"

ping -c 1 -W 1 $PC_IP > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Schalte PC aus..."
    pigs w 17 1
    sleep 0.5
    pigs w 17 0
else
    echo "PC ist bereits aus."
fi