import logging
import os

class Logging:

    def __init__(self, dirName='output', fileName='metrics.log', level=logging.DEBUG):
        FORMAT = "%(asctime)s %(levelname)s %(filename)s [%(funcName)s():%(lineno)s] %(message)s"

        # Create the directory if it doesn't exist
        if not os.path.exists(dirName):
            os.makedirs(dirName)

        logging.basicConfig(filename="output/metrics.log", format=FORMAT, filemode='w')
        self._logger = logging.getLogger()
        self._logger.setLevel(level)
