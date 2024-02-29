---
id: C3-Technical-Interview
created_date: 06/02/2023
updated_date: 06/02/2023
type: interview
---

# will-yuponce

- **🏷️Tags** :  #company #c3 #c3-ai #interview

# Notes

# Scorecard Template

****If you are shadowing the interview please write “I shadowed this interview” at the top of your scorecard summary**

## Summary

Will did very well in his interview. He was proficient in his given language, and would have no issues working in a customer-facing role like ours. I would strongly consider will for a position @ c3.

## Question(s) asked:

## Evaluation

Numerical scores correspond to the following qualitative assessments:

( 1 - Very Poor, 2 - Poor, 3 - Fair, 4 - Good, 5 - Excellent )

Area: Problem Definition/Comprehension

Score: 5

Justification: Will asked great questions and was focused on exploring the problem intently.

---

Area: Coding Proficiency/Robustness

Score: 5

Justification: Will knew his chosen language well and no issues thinking through potential advanced data structures.

---

Area: Algorithm Efficiency + Analysis

Score: 4

Justification: Hi algorithmic choice was very reasonable although somewhat intricate for the time being. He was able to address the specific efficiencies accurately.

---

Area: Communication Skills + Structured Thinking

Score: 5

Justification: Will has natural talent for engaging and connecting to people.

---

Area: Debugging/Troubleshooting

Score: 5

Justification: Will was able to debug some tricky off by one errors and was receptive to feedback.

## Code

https://coderbyte.com/editor/sharing:xh6HBwTq

Count distinct elements in every window of size k

Given an array of size N and an integer K, return the count of distinct numbers in all windows of size K.

Input: arr[] = {1, 2, 1, 3, 4, 2, 3}, K = 4

```java

import java.util.*;
import java.io.*;

class Main {

  // [ 1, 1, 1, 1, 1, 0 ], k = 5 == number of windows == 2
  // w0: 1
  // w1: 2
  // 

  
  public static ArrayList<Integer> countDistinctElems(int arr[], int k) {
    //Number of unique occurences
    ArrayList<Integer> count = new ArrayList<>();
    int begining = 0;
    int end = 0;
    //int[] arr = new int[128];
    HashMap<Integer, Integer> window = new HashMap<>();
    for(int i = 0; i < arr.length; i++) {
      window.put(arr[i], window.getOrDefault(arr[i], 0) + 1);
      if(end - begining == k - 1) {
        //Windows full, check the window for unique elements
        ArrayList<Integer> list = new ArrayList<>();
        int tempCount = 0;
        for(int j = begining; j < end + 1; j++) {
          //Unique occurence
          if(!list.contains(arr[j])){
            list.add(arr[j]);
            tempCount++;
          }
        }
        count.add(tempCount);
        window.put(arr[begining], window.get(arr[begining]) - 1);
        begining++; 
      }
      end++;
    }
    return count;
  }

  public static void main (String[] args) {
    int[] arr = {  1, 1, 1, 1, 1, 0 };
    int [] arr2 = {1,2, 1, 3, 4, 2, 3};
    System.out.println(countDistinctElems(arr, 5)); // expect 2 windows
    System.out.println(countDistinctElems(arr, 3)); // expect 2 windows
    System.out.println(countDistinctElems(arr2, 4)); // expect 2 windows
  }

}

```
