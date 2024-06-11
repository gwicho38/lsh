from openai import OpenAI
import click
import os
import time
import requests
from threading import Thread
from queue import Queue
from openai import OpenAI

@click.group()
def save():
    """A tool for analyzing pull requests."""
    pass

@save.group()
def link():
    """Commands for pull request operations."""
    pass

@link.command(help="Compare a file between two branches and analyze the changes.",
            epilog="Example usage:\n\n"
                   "  python analyze_pr.py pr compare 'https://api.github.com/repos/c3-e/c3generativeAi/pulls/3615' genai/genAiBase/config/Genai.Agent.Config/QueryOrchestrator_default.json")
@click.argument('pr_url')
def add(pr_url):
    print(pr_url)

if __name__ == "__main__":
    save()

