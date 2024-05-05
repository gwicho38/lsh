import datetime
import json

class RunTime:
    _startTime = '' # String to record start time
    _endTime = '' # String to record end time
    _outputFile = '' # File to store start, end and delta

    def __init__(self, dir, filename) -> None:
        self._outputFile = dir + filename + '_runtime.json'
    
    def _start(self):
        self._startTime = datetime.datetime.now()

    def _stop(self):
        self._endTime = datetime.datetime.now()
        timeDelta = self._endTime - self._startTime
        
        output = {}
        output['Start'] = self._startTime.strftime("%Y-%m-%d %H:%M:%S")
        output['End'] = self._endTime.strftime("%Y-%m-%d %H:%M:%S")
        output['Delta'] = "{:02d} days, {:02d} hours, {:02d} minutes, {:02d} seconds".format(
            timeDelta.days, timeDelta.seconds // 3600, (timeDelta.seconds % 3600) // 60, timeDelta.seconds % 60)
        
        f = open(self._outputFile, 'w')
        json.dump(output, f, indent=4)
        f.close()
