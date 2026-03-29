#!/bin/bash
PC_IP="192.168.1.9"

ping -c 1 -W 1 $PC_IP > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "PC ist bereits an."
else
    echo "Schalte PC ein..."
    pigs w 17 1
    sleep 0.5
    pigs w 17 0
fi