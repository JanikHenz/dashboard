#!/bin/bash
UPTIME_MS=$(awk '{print int($1 * 1000)}' /proc/uptime)
curl -X POST -H "Content-Type: application/json" -d "{\"uptime_ms\": $UPTIME_MS}" https://janikhenz.ch/api/pc-data