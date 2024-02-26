---
id: C3-Technical-Interview
created_date: 03/05/2023
updated_date: 03/05/2023
type: interview
---

# jay-young

- **🏷️Tags** :  #company #c3 #c3-ai #interview
[](#anki-card)

# Notes

# Scorecard Template

****If you are shadowing the interview please write “I shadowed this interview” at the top of your scorecard summary**

## Summary

Jay would be successful at C3. He would likely have done even better save for some nerves. 

## Question(s) asked:

Status codes. 

## Evaluation

Numerical scores correspond to the following qualitative assessments:

( 1 - Very Poor, 2 - Poor, 3 - Fair, 4 - Good, 5 - Excellent )

Area: Problem Definition/Comprehension

Score: (1-5): 3

Justification: Jay clearly understood the problem. He could have taken more time to flesh out assumptions. Nerves likely contributed to the brief nature of his questioning. 

---

Area: Coding Proficiency/Robustness

Score: (1-5): 4

Justification: Jay solved the problem with only small errors. He solved the problem with a 2nd order solution. 

---

Area: Algorithm Efficiency + Analysis

Score: (1-5): 4

Justification: Jay successfully analyzed the runtime of his code. In the future, he could work on adding more detail or asking more clarifying questions. 

---

Area: Communication Skills + Structured Thinking

Score: (1-5): 4

Justification: Jay was a good culture fit and evidenced efficient problem solving skills. 

---

Area: Debugging/Troubleshooting

Score: (1-5): 4

Justification: Jay was open to guidance when prompted to improve his code. 


## Code

```md


arr = [1, 2, 1, 3, 4, 2, 3]
k = 4

from collections import Counter
def sum_of_distinct_numbers(arr, k):
  sum = 0

  if not arr and len(arr) == 0:
    return sum

  for i in range(len(arr) - k + 1):
    window = arr[i:i+k]

    disct_window_len = len(dict(Counter(window)))
    sum += disct_window_len
    print(disct_window_len)
  
  return sum


# def sum_of_distinct_numbers(arr, k):
#   sum = 0

#   if not arr and len(arr) == 0:
#     return sum

#   for i in range(len(arr) - k + 1):
#     window = arr[i:i+k]
#     temp = set()
#     for each in window:
#       temp.add(each)

#     sum += len(temp)
#     print(len(temp))
  
#   return sum```
