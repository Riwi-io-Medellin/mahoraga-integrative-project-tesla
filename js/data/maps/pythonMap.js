export const pythonMap = [

  //  BÁSICO (1–8)
  { id: 1, title: "Syntax and Data Types", x: 100, y: 250, requires: null, difficulty: "basic", topics: ["Python syntax and indentation rules.", "Primitive data types (int, float, str, bool).", "Type conversion and common type errors."] },
  { id: 2, title: "Variables and Operators", x: 180, y: 120, requires: 1, difficulty: "basic", topics: ["Variable assignment and naming conventions.", "Arithmetic, comparison and logical operators.", "Operator precedence in expressions."] },
  { id: 3, title: "Control Structures", x: 300, y: 300, requires: 2, difficulty: "basic", topics: ["if, elif, else decision flow.", "for and while loops.", "break, continue and basic loop patterns."] },
  { id: 4, title: "Functions", x: 400, y: 180, requires: 3, difficulty: "basic", topics: ["Defining and calling functions.", "Parameters, arguments and return values.", "Variable scope basics."] },
  { id: 5, title: "Data Structures", x: 520, y: 320, requires: 4, difficulty: "basic", topics: ["Lists, tuples and dictionaries.", "Sets and when to use each structure.", "Basic CRUD operations on collections."] },
  { id: 6, title: "Entrance / Exit", x: 620, y: 150, requires: 4, difficulty: "basic", topics: ["Reading user input with input().", "Printing and formatting output.", "Simple data validation from input."] },
  { id: 7, title: "Exception Handling", x: 750, y: 280, requires: 5, difficulty: "basic", topics: ["try, except, else and finally.", "Handling common runtime errors.", "Raising custom exceptions with raise."] },
  { id: 8, title: "Understanding Collections", x: 850, y: 120, requires: 5, difficulty: "basic", topics: ["Iteration over lists and dictionaries.", "Membership tests and slicing.", "Selecting the right collection for each case."] },

  //  INTERMEDIO (9–17)
  { id: 9, title: "Classes and Objects", x: 980, y: 300, requires: 7, difficulty: "intermediate", topics: ["Creating classes and instances.", "__init__ and instance attributes.", "Encapsulation basics."] },
  { id: 10, title: "Methods and Attributes", x: 1100, y: 180, requires: 9, difficulty: "intermediate", topics: ["Instance vs class methods.", "@classmethod and @staticmethod.", "Class attributes vs instance attributes."] },
  { id: 11, title: "Inheritance and Polymorphism", x: 1220, y: 320, requires: 10, difficulty: "intermediate", topics: ["Base and child classes.", "Method overriding.", "Using polymorphism for clean design."] },
  { id: 12, title: "Modules and Packages", x: 1340, y: 150, requires: 6, difficulty: "intermediate", topics: ["import patterns and module structure.", "Creating reusable packages.", "Relative vs absolute imports."] },
  { id: 13, title: "Functional Programming", x: 1460, y: 290, requires: 8, difficulty: "intermediate", topics: ["lambda and higher-order functions.", "map, filter and reduce.", "Immutability principles in Python."] },
  { id: 14, title: "Interior decorators", x: 1580, y: 130, requires: 13, difficulty: "intermediate", topics: ["Decorator syntax with @.", "Wrapper functions and closures.", "Practical decorator use cases."] },
  { id: 15, title: "Generators", x: 1700, y: 260, requires: 13, difficulty: "intermediate", topics: ["yield and generator functions.", "Lazy evaluation benefits.", "Iterators vs generators."] },
  { id: 16, title: "File Manipulation", x: 1820, y: 160, requires: 6, difficulty: "intermediate", topics: ["Reading and writing files safely.", "with context manager usage.", "Working with text and JSON files."] },
  { id: 17, title: "Virtual Environments and Pip", x: 1940, y: 300, requires: 12, difficulty: "intermediate", topics: ["Creating virtual environments.", "Installing and pinning dependencies.", "requirements.txt best practices."] },

  //  AVANZADO (18–25)
  { id: 18, title: "Asynchronous Programming", x: 2060, y: 140, requires: 15, difficulty: "advanced", topics: ["async/await fundamentals.", "Event loop behavior.", "Handling concurrent I/O tasks."] },
  { id: 19, title: "Testing with Pytest", x: 2180, y: 280, requires: 16, difficulty: "advanced", topics: ["Writing unit tests with pytest.", "Fixtures and parametrized tests.", "Testing exceptions and edge cases."] },
  { id: 20, title: "Design Patterns", x: 2300, y: 160, requires: 11, difficulty: "advanced", topics: ["Common OOP patterns in Python.", "When to apply each pattern.", "Tradeoffs and maintainability."] },
  { id: 21, title: "Web Development (Flask/Django)", x: 2420, y: 300, requires: 11, difficulty: "advanced", topics: ["Request/response lifecycle.", "Routing, views and templates.", "Project structure for web apps."] },
  { id: 22, title: "REST APIs", x: 2540, y: 140, requires: 21, difficulty: "advanced", topics: ["REST principles and resources.", "HTTP methods and status codes.", "Validation and error responses."] },
  { id: 23, title: "Automation and Scripting", x: 2660, y: 260, requires: 16, difficulty: "advanced", topics: ["Building CLI scripts.", "Task automation with Python.", "Logging and robust script handling."] },
  { id: 24, title: "Data Science (NumPy / Pandas)", x: 2780, y: 160, requires: 13, difficulty: "advanced", topics: ["Array operations with NumPy.", "DataFrames in pandas.", "Cleaning and transforming datasets."] },
  { id: 25, title: "Machine Learning Basic", x: 2900, y: 300, requires: 24, difficulty: "advanced", topics: ["Supervised learning basics.", "Train/test split and evaluation.", "Using scikit-learn workflows."] }

];
