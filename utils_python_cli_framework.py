#!/usr/bin/env python3

# Copyright 2009-2022 C3 AI (www.c3.ai). All Rights Reserved.
# This material, including without limitation any software, is the confidential trade secret and proprietary
# information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
# strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
# This material may be covered by one or more patents or pending patent applications.

"""
Python CLI framework that aims to simplify writing of v8 clis on python.
Common way to use is
'v8 <subject> <action> <parameters>'

command `help` accepted at any level.

See example of defining new subject:
```
k8s_coredns = cli.subject(
    name='k8s-coredns',
    help='<one line description',
    description='<detailed description of the subject>',
    common_options=[
        CliOption(['-c', '--context'], {'help': 'K8s context to use. If not specified current context will be used'})
        <list of options that would be added to all subject actions>
    ]
)

@k8s_coredns.command()
def info(context=None):
    '''Help message of info action'''


@k8s_coredns.command(options=[
    CliOption(['host'], {'help': 'Host name that need to be resolved'}),
])
def rewrite(host, context=None):
    '''Help message for rewrite action'''
```
"""


import inspect
from collections import namedtuple
from functools import wraps
import builtins
import logging
import argparse
from textwrap import dedent
# from utils_local_setup import FormatWithColors
import sys

__all__ = ['cli', 'CliOption']


class _SaneFormatter(argparse.RawTextHelpFormatter, argparse.ArgumentDefaultsHelpFormatter):
    pass


class Subject:
    """
    Base class for construction CLI entrypoint like v8 <subject> <action>

    It creates <subject> section for command v8 command and allow too create <actions> using decorators. Example
    ```
    from utils_python_cli_framework import cli, CliOption
    k8s_local = cli.subject(
        name='k8s-local', help='Short description', description='long multiline description', common_options=[
            CliOption(['-p', '--profile'], {'help': 'minikube profiles'}),
        ]
    )

    @k8s_local.command()
    def configure(profile):
        '''command help'''
        ...

    @k8s_local.command(options=[
        CliOption(['-s', '--stop-minikube'], {'help': 'stop cluster', 'action': 'store_true', 'dest': 'stop_minikube'}),
    ])
    def clear(profile, stop_minikube=False):
        '''command help'''
        ...
    ```

    In this example subject `k8s-local` is created with two actions `configure` and `clear`. Both of them have parameter
    `profile`. `clear` action also have optional parameter `-s`.

    Second parameter of `CliOption` accepts same parameters as argparse add_argument. Such parameters should be passed
    as a dict.
    """
    def __init__(self, cli, name, common_options, parser):
        self._cli = cli
        self._name = name
        self._cli.parsers[name + '.'] = parser
        self.parser = parser
        self.common_options = common_options

        if common_options:
            common_parser_group = self.parser.add_argument_group("Subject level arguments")
            for option in common_options or []:
                option_names = (option.names,) if isinstance(option.names, str) else option.names
                common_parser_group.add_argument(*option_names, **option.parameters)

        self._subject_parser = self.parser.add_subparsers(
            parser_class=ParserWithCapturingErrors, title='Action', dest='action')
        self.command('help', 'Show this help message')(lambda: self.parser.print_help())

    def command(self, name=None, help=None, description=None, options=None, **kwargs):
        def decorator(f):
            parser_name = f.__name__ if name is None else name
            parser = self._subject_parser.add_parser(
                name=parser_name,
                help=f.__doc__.split('\n')[0] if help is None and f.__doc__ else help,
                description=f.__doc__ if description is None and f.__doc__ else description,
                parents=[self._cli.common_parser],
                formatter_class=_SaneFormatter,
                **kwargs,
            )

            if self.common_options:
                common_parser_group = parser.add_argument_group("Subject level arguments")
                for option in self.common_options:
                    option_names = (option.names,) if isinstance(option.names, str) else option.names
                    common_parser_group.add_argument(*option_names, **option.parameters)

            if options:
                parser_group = parser.add_argument_group("Action level arguments")
                for option in options:
                    option_names = (option.names,) if isinstance(option.names, str) else option.names
                    parser_group.add_argument(*option_names, **option.parameters)

            self._cli.parsers[f'{self._name}.{parser_name}'] = parser

            @wraps(f)
            def wrapper(parsed):
                setattr(f, 'parsed', parsed)
                params = {p: getattr(parsed, p, None) for p in inspect.signature(parsed.func).parameters}
                return f(**params)

            setattr(f, 'cliWrapper', wrapper)
            parser.set_defaults(func=wrapper)
            return f

        return decorator


class ParserWithCapturingErrors(argparse.ArgumentParser):
    def error(self, message):
        logger.error(f'Command line options parsing failure: {message}')
        self.print_help()
        sys.exit(2)


class CLI:
    """Main entry point of CLI. It used too construct <subjects> and to parse command line arguments."""
    def __new__(cls, *args, **kwargs):
        """Ensure CLI is singleton"""
        if not hasattr(builtins, '__c3_cli_instance'):
            setattr(builtins, '__c3_cli_instance', super(CLI, cls).__new__(cls))
            getattr(builtins, '__c3_cli_instance').__init(*args, **kwargs)
        return getattr(builtins, '__c3_cli_instance')

    def __init(self, prog, description, formatter_class=_SaneFormatter, **kwargs):

        self.common_parser = argparse.ArgumentParser(add_help=False)

        common_parser_group = self.common_parser.add_argument_group("Global arguments")

        common_parser_group.add_argument('-d', '--debug', action='store_true', help='Show additional output',
                                         default=argparse.SUPPRESS)
        common_parser_group.add_argument('-m', '--no-colors', action='store_true', help='Disable colors in outputs',
                                         default=argparse.SUPPRESS)

        self._parser = ParserWithCapturingErrors(prog=prog, description=description, formatter_class=formatter_class,
                                                 parents=[self.common_parser], **kwargs)

        self.subparsers = self._parser.add_subparsers(title='Subject', parser_class=ParserWithCapturingErrors,
                                                      dest='subject')
        self.parsers = {}

        self.subparsers.add_parser('help', help='Shows current help message')

    def subject(self, name, formatter_class=_SaneFormatter, common_options=None, **kwargs) -> Subject:
        if 'description' in kwargs:
            kwargs['description'] = dedent(kwargs['description'])

        return Subject(self, name, common_options, self.subparsers.add_parser(name, formatter_class=formatter_class,
                                                                              parents=[self.common_parser], **kwargs))

    def start(self, args=None):
        if args is None:
            args = sys.argv[1:]

        parsed_arg, unrecognized = self._parser.parse_known_args(args)

        if unrecognized:
            parser_name = f"{getattr(parsed_arg, 'subject', '')}.{getattr(parsed_arg, 'action', '')}"
            self.parsers.get(parser_name, self._parser).print_help()
            if 'help' in unrecognized:
                sys.exit(0)
            unrecognized = ", ".join(unrecognized)
            logger.error(f'Unrecognized arguments: {unrecognized}')
            sys.exit(2)

        if getattr(parsed_arg, 'debug', False):
            logger.setLevel(logging.DEBUG)
            logger.debug('Enable debugging mode')

        if getattr(parsed_arg, 'no_colors', False):
            formatter.no_colors(True)

        if getattr(parsed_arg, 'subject', None) == 'help' or getattr(parsed_arg, 'subject', None) is None:
            self._parser.print_help()
            sys.exit(0)

        if getattr(parsed_arg, 'action', None) is None:
            self.parsers[f"{getattr(parsed_arg, 'subject')}."].print_help()
            sys.exit(0)

        parsed_arg.func(parsed_arg)


# This represent argument that usually added by `argparse` `parser.add_argument`.
# Parameters are used to construct argument as follow: `parser.add_argument(*names, **parameters)
CliOption = namedtuple('CliOption', ['names', 'parameters'])

cli = CLI('v8', 'V8 CLIs entrypoint')


if __name__ == '__main__':
    # Configure logger
    logger = logging.getLogger()
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    # formatter = FormatWithColors('%(message)s')
    # ch.setFormatter(formatter)
    logger.handlers = [ch]
    logger.setLevel(logging.INFO)

    # import all subjects/* handlers.
    __import__('subjects')
    cli.start()
