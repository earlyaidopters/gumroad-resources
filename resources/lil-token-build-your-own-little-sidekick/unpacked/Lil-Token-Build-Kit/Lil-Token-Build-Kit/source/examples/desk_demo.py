#!/usr/bin/env python3
"""Offline teaching example. Uses synthetic data and no network or microphone."""
import json

question = 'What is on my calendar?'
tools = {'calendar': lambda: [{'time': '10:00', 'title': 'Test meeting'}, {'time': '14:00', 'title': 'Build a robot'}]}
print('You:', question)
print('Demo agent selects the calendar tool.')
events = tools['calendar']()
print('Tool result:', json.dumps(events))
print('Lil Token: You have a test meeting at ten, then time to build a robot at two.')
print('The physical version uses Claude for tool decisions and Fish Audio for speech.')
