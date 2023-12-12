---
id: C3-Technical-Interview
created_date: 23/06/2023
updated_date: 23/06/2023
type: interview
---

#  brendan-pan

- **🏷️Tags** :   #company #c3 #c3-ai #interview
[ ](#anki-card)

# Notes


# Scorecard Template

****If you are shadowing the interview please write “I shadowed this interview” at the top of your scorecard summary**

## Summary


## Question(s) asked:


## Evaluation

Numerical scores correspond to the following qualitative assessments:

( 1 - Very Poor, 2 - Poor, 3 - Fair, 4 - Good, 5 - Excellent )

Area: Problem Definition/Comprehension

Score: (1-5)

Justification:

---

Area: Coding Proficiency/Robustness

Score: (1-5)

Justification:

---

Area: Algorithm Efficiency + Analysis

Score: (1-5)

Justification:

---

Area: Communication Skills + Structured Thinking

Score: (1-5)

Justification:

---

Area: Debugging/Troubleshooting

Score: (1-5)

Justification:

## Code


[Coderbyte](https://coderbyte.com/editor/sharing:ps1Qz2zb)

```java

import java.util.*;
import java.io.*;

class Main {

  public static List<Integer> foo(int k, int[] arr) {

    List<Integer> distinctSizeList = new ArrayList<Integer>();
    //Iterate through array length minus k
    for(int i = 0; i < arr.length-k; i++) {
      //Iterate through starting array + k
      Set<Integer> intSet = new HashSet<Integer>();
      for(int j = i; j < i + k; j++) {
        //Put values in map and find out distinct;
        intSet.add(arr[j]);
      }
      distinctSizeList.add(intSet.size());
    }
    return distinctSizeList;
  }

  public static void main (String[] args) {
    List<Integer> distinctElements = foo(4, new int[]{1, 2, 1, 3, 4, 2, 3});
    System.out.println(distinctElements);

  }
}
```