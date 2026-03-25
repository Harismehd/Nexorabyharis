@echo off
echo Starting Gym WhatsApp Fee Automation System...

echo Starting Backend Server...
start cmd /k "cd backend && npm start"

echo Starting Frontend App...
start cmd /k "cd frontend && npm run dev"

echo Both systems are starting up. Please check the new terminal windows.
