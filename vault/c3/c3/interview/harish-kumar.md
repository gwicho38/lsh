---
id: C3-Technical-Interview
created_date: 08/03/2023
updated_date: 08/03/2023
type: interview
---

#  harish-kumar

- **🏷️Tags** :  #03-2023 #company #c3 #c3-ai 
[ ](#anki-card)

# Notes

Input: arr[] = [3, 0, 2, 0, 4]

Output: 

Given an array of N non-negative integers arr[] representing an elevation map where the width of each bar is 1, compute how much water it is able to trap after raining.

# Scorecard Template

****If you are shadowing the interview please write “I shadowed this interview” at the top of your scorecard summary**

## Summary

## Question(s) asked:

Input: arr[] = [3, 0, 2, 0, 4]

Output: 

Given an array of N non-negative integers arr[] representing an elevation map where the width of each bar is 1, compute how much water it is able to trap after raining.

## Evaluation

Numerical scores correspond to the following qualitative assessments:

( 1 - Very Poor, 2 - Poor, 3 - Fair, 4 - Good, 5 - Excellent )

Area: Problem Definition/Comprehension

Score: 2

Justification: Harish jumped to solving the problem without asking question or a clear understanding of what was being asked. 

---

Area: Coding Proficiency/Robustness

Score: 3

Justification: Harish can write code in the given language.

---

Area: Algorithm Efficiency + Analysis

Score: 2

Justification: Harish's first asserted runtime analysis was incorrect. 

---

Area: Communication Skills + Structured Thinking

Score: 2

Justification: Harish did not explain in detail what was confusing him. 

---

Area: Debugging/Troubleshooting

Score: 2

Justification: Harish was passive when it came to engaging with the questions. 

## Code

```java

import java.util.*;
import java.io.*;

class Main {

  public static int waterVolume(int arr[]) {
    int volume = 0;
    
    int local_max[] = new int[arr.length];
    for (int i = 0; i < arr.length; i++) {
      
    }


    for (int j = 0; j < arr.length; j++) {
      volume += max - arr[j];
    }

    return volume;

  }

  /*    *
  *     *
  *  *  *
  *  *  *
  */

  public static void main (String[] args) {
    System.out.print(Foo("hello"));
  }

}
```

[coderbyte](https://coderbyte.com/editor/sharing:AITXKFkK)
