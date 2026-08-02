export interface PythonQuestion {
  id: string;
  title: string;
  code: string;
  prompt: string;
}

/** Total time for both questions combined. */
export const PYTHON_TIME_LIMIT_SECONDS = 600;

export const PYTHON_QUESTIONS: PythonQuestion[] = [
  {
    id: 'off-by-one',
    title: 'Off-by-one in a loop',
    code: `def sum_first_n(numbers, n):
    total = 0
    for i in range(n):
        total += numbers[i]
    return total

print(sum_first_n([1, 2, 3], 5))`,
    prompt: 'What breaks, and why?',
  },
  {
    id: 'modify-while-iterating',
    title: 'Modifying a list while iterating over it',
    code: `nums = [1, 2, 3, 4, 5]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)
print(nums)`,
    prompt: "What's the actual output (it's surprising), and why does this happen?",
  },
  {
    id: 'immutable-string-method',
    title: "Function that doesn't do what it looks like it does",
    code: `def shout(word):
    word.upper()
    return word

print(shout("hello"))`,
    prompt: "What prints? Why doesn't this behave the way it looks like it should?",
  },
  {
    id: 'accumulator-reset',
    title: 'Accumulator reset inside the loop',
    code: `def total_sales(sales):
    for amount in sales:
        total = 0
        total += amount
    return total

print(total_sales([100, 250, 75]))`,
    prompt: 'What does this return, and why is it wrong?',
  },
  {
    id: 'infinite-loop',
    title: 'Infinite loop',
    code: `def countdown(n):
    while n > 0:
        print(n)
    return "Done"`,
    prompt: 'What happens when you run this?',
  },
  {
    id: 'loop-bound-skip',
    title: 'Loop bound skips an element',
    code: `def print_all(items):
    for i in range(len(items) - 1):
        print(items[i])

print_all(["a", "b", "c"])`,
    prompt: "What's printed, and what's missing?",
  },
  {
    id: 'early-return',
    title: 'Early return inside a loop',
    code: `def contains_negative(numbers):
    for n in numbers:
        if n < 0:
            return True
        else:
            return False
    return False

print(contains_negative([5, 3, -2, 8]))`,
    prompt: 'What does this return? Why is it wrong even though `-2` is in the list?',
  },
  {
    id: 'wrong-logical-op',
    title: 'Wrong logical operator',
    code: `def is_child_or_senior(age):
    if age < 12 and age > 65:
        return True
    return False

print(is_child_or_senior(8))
print(is_child_or_senior(70))`,
    prompt: 'What does this return for both calls? What\'s the logic error?',
  },
];

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick `count` distinct questions at random from the bank. */
export function getRandomPythonQuestions(count = 2): PythonQuestion[] {
  const n = Math.min(count, PYTHON_QUESTIONS.length);
  return shuffleInPlace([...PYTHON_QUESTIONS]).slice(0, n);
}

export function getPythonQuestionById(id: string): PythonQuestion | undefined {
  return PYTHON_QUESTIONS.find((q) => q.id === id);
}
