#!/usr/bin/env node

/**
 * Cross-language analysis test for CodeAnalyzer
 * Tests TypeScript, JavaScript, Python, Java, and C# parsing capabilities
 * Validates regex robustness across different language constructs
 */

import { CodeAnalyzer } from '../src/analyzer/code-analyzer.js';
import { createTestRunner } from './shared/test-utils.js';

const TEST_CASES = {
  typescript: {
    // Basic scenarios
    basic: `
export class UserService {
  private apiKey: string;
  public readonly baseUrl: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  public async getUser(id: number): Promise<User> {
    return this.fetchData(\`/users/\${id}\`);
  }
  
  private async fetchData(endpoint: string): Promise<any> {
    // Implementation
  }
  
  protected validateInput(input: unknown): boolean {
    return typeof input === 'string';
  }
  
  static getInstance(): UserService {
    return new UserService('default');
  }
}

export interface User {
  id: number;
  name: string;
  getDisplayName(): string;
}

export type UserRole = 'admin' | 'user' | 'guest';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}
`,
    
    // Complex scenarios with nested functions, generics, decorators
    complex: `
@injectable()
export class DatabaseService<T extends BaseEntity> {
  private readonly connection: Connection;
  
  @cached(300)
  public async find<K extends keyof T>(
    criteria: Partial<Pick<T, K>>,
    options?: FindOptions
  ): Promise<T[]> {
    const query = this.buildQuery(criteria);
    return this.executeQuery(query);
  }
  
  private buildQuery<K extends keyof T>(criteria: Partial<Pick<T, K>>): Query {
    // Nested arrow function
    const mapCriteria = (key: K) => ({
      field: key,
      value: criteria[key]
    });
    
    return Object.keys(criteria).map(mapCriteria);
  }
  
  protected async executeQuery(query: Query): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.connection.query(query, (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
  }
}

export abstract class BaseRepository<T> {
  abstract save(entity: T): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
}
`,
    
    // Edge cases: comments, strings, complex syntax
    edgeCases: `
export class CommentedClass {
  // This is not a function: async notAFunction() => {}
  /* Also not a function:
     function fakeFunction() {}
  */
  
  public realFunction(): string {
    const notAMethod = "function fake() {}";
    const template = \`
      This template contains fake code:
      class FakeClass {
        fakeMethod() {}
      }
    \`;
    
    // Regex should ignore this
    return "result";
  }
  
  // Getters and setters
  get value(): number {
    return this._value;
  }
  
  set value(newValue: number) {
    this._value = newValue;
  }
  
  // Arrow function property
  private arrowMethod = async (param: string): Promise<void> => {
    console.log(param);
  };
  
  // Conditional method
  [Symbol.iterator](): Iterator<any> {
    return this;
  }
}
`
  },
  
  python: {
    basic: `
class UserService:
    def __init__(self, api_key: str):
        self._api_key = api_key
        self.base_url = "https://api.example.com"
    
    async def get_user(self, user_id: int) -> dict:
        """Fetch user data from API"""
        return await self._fetch_data(f"/users/{user_id}")
    
    def _fetch_data(self, endpoint: str) -> dict:
        # Private method
        pass
    
    @classmethod
    def create_default(cls) -> 'UserService':
        return cls("default_key")
    
    @staticmethod
    def validate_id(user_id: int) -> bool:
        return user_id > 0
    
    @property
    def api_key(self) -> str:
        return self._api_key
    
    @api_key.setter
    def api_key(self, value: str) -> None:
        self._api_key = value
`,
    
    complex: `
class DatabaseConnection(ABC):
    '''Abstract database connection'''
    
    @abstractmethod
    async def connect(self) -> None:
        pass
    
    @abstractmethod
    def query(self, sql: str) -> List[Dict[str, Any]]:
        pass

class PostgreSQLConnection(DatabaseConnection):
    def __init__(self, host: str, port: int = 5432):
        self.host = host
        self.port = port
    
    async def connect(self) -> None:
        # Nested function
        def build_connection_string() -> str:
            return f"postgresql://{self.host}:{self.port}"
        
        connection_string = build_connection_string()
        # Connect logic here
    
    def query(self, sql: str) -> List[Dict[str, Any]]:
        # Method with complex return type
        return []
`
  },
  
  java: {
    basic: `
public class UserService {
    private String apiKey;
    protected final String baseUrl;
    
    public UserService(String apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://api.example.com";
    }
    
    public User getUser(int id) throws ApiException {
        return fetchData("/users/" + id);
    }
    
    private User fetchData(String endpoint) throws ApiException {
        // Implementation
        return null;
    }
    
    protected boolean validateInput(Object input) {
        return input != null;
    }
    
    public static UserService getInstance() {
        return new UserService("default");
    }
}

public interface UserRepository {
    User findById(Long id);
    List<User> findAll();
    void save(User user);
}

public enum UserStatus {
    ACTIVE("active"),
    INACTIVE("inactive");
    
    private final String value;
    
    UserStatus(String value) {
        this.value = value;
    }
    
    public String getValue() {
        return value;
    }
}
`,
    
    complex: `
@Service
@Transactional
public class OrderService extends BaseService<Order> implements OrderRepository {
    
    @Autowired
    private PaymentService paymentService;
    
    @Override
    @Cacheable(value = "orders", key = "#id")
    public Optional<Order> findById(Long id) {
        return repository.findById(id);
    }
    
    public <T extends Payment> CompletableFuture<OrderResult> processOrder(
        Order order, 
        T payment,
        Consumer<OrderResult> callback
    ) {
        return CompletableFuture.supplyAsync(() -> {
            // Nested lambda
            payment.getTransactions().stream()
                .filter(t -> t.isValid())
                .forEach(callback::accept);
            
            return new OrderResult(order.getId());
        });
    }
}
`
  },
  
  csharp: {
    basic: `
public class UserService
{
    private string _apiKey;
    protected readonly string BaseUrl;
    
    public UserService(string apiKey)
    {
        _apiKey = apiKey;
        BaseUrl = "https://api.example.com";
    }
    
    public async Task<User> GetUserAsync(int id)
    {
        return await FetchDataAsync($"/users/{id}");
    }
    
    private async Task<User> FetchDataAsync(string endpoint)
    {
        // Implementation
        return null;
    }
    
    protected bool ValidateInput(object input)
    {
        return input != null;
    }
    
    public static UserService GetInstance()
    {
        return new UserService("default");
    }
    
    public string ApiKey 
    { 
        get => _apiKey; 
        set => _apiKey = value; 
    }
}

public interface IUserRepository
{
    Task<User> FindByIdAsync(int id);
    Task<IList<User>> FindAllAsync();
    Task SaveAsync(User user);
}

public enum UserStatus
{
    Active,
    Inactive,
    Pending
}
`
  }
};

async function runCrossLanguageTests() {
  console.log('🌍 Testing CodeAnalyzer Cross-Language Analysis\n');
  const { test, printResults } = await createTestRunner('Cross-Language Analysis Tests');

  const analyzer = await CodeAnalyzer.getInstance({
    maxDepth: 3,
    maxFileSizeMB: 10,
    timeoutMs: 30000,
    keySourceFiles: 10,
    topFunctions: 20,
    topClasses: 5,
    topDependencies: 20,
    summaryLines: 10
  });

  // Test TypeScript scenarios
  console.log('🔵 Testing TypeScript Analysis');
  console.log('-'.repeat(40));

  await test('TypeScript basic class and method detection', async () => {
    const result = await analyzer.analyzeFile(TEST_CASES.typescript.basic, 'test.ts');
    
    console.log('Functions found:', result.functions.map(f => `${f.name} (${f.isAsync ? 'async' : 'sync'})`));
    console.log('Classes found:', result.classes.map(c => `${c.name} (${c.methods?.length || 0} methods)`));
    
    // Should find the class
    const userServiceClass = result.classes.find(c => c.name === 'UserService');
    console.log('UserService class:', userServiceClass);
    
    // Should find public, private, protected, and static methods
    const expectedMethods = ['constructor', 'getUser', 'fetchData', 'validateInput', 'getInstance'];
    const foundMethods = result.functions.filter(f => expectedMethods.includes(f.name));
    console.log('Expected methods found:', foundMethods.map(f => f.name));
    
    // Should detect async methods
    const asyncMethods = result.functions.filter(f => f.isAsync);
    console.log('Async methods:', asyncMethods.map(f => f.name));
    
    return {
      foundClass: !!userServiceClass,
      foundMethods: foundMethods.length >= 3, // At least some methods
      foundAsync: asyncMethods.length > 0,
      foundInterface: result.classes.some(c => c.name === 'User'),
      foundEnum: result.classes.some(c => c.name === 'UserStatus')
    };
  });

  await test('TypeScript complex scenarios with generics', async () => {
    const result = await analyzer.analyzeFile(TEST_CASES.typescript.complex, 'complex.ts');
    
    console.log('Complex Functions:', result.functions.map(f => f.name));
    console.log('Complex Classes:', result.classes.map(c => c.name));
    
    return {
      foundGenericClass: result.classes.some(c => c.name === 'DatabaseService'),
      foundAbstractClass: result.classes.some(c => c.name === 'BaseRepository'),
      foundComplexMethods: result.functions.some(f => f.name === 'find'),
      foundNestedFunctions: result.functions.length > 3
    };
  });

  await test('TypeScript edge cases and false positives', async () => {
    const result = await analyzer.analyzeFile(TEST_CASES.typescript.edgeCases, 'edges.ts');
    
    console.log('Edge case functions:', result.functions.map(f => f.name));
    console.log('Edge case classes:', result.classes.map(c => c.name));
    
    // Should NOT find functions/classes in comments or strings
    const shouldNotFind = ['notAFunction', 'fakeFunction', 'FakeClass', 'fakeMethod'];
    const falsePositives = result.functions.filter(f => shouldNotFind.includes(f.name))
      .concat(result.classes.filter(c => shouldNotFind.includes(c.name)));
    
    // Should find real methods including getters/setters and arrow functions
    const shouldFind = ['realFunction', 'value', 'arrowMethod'];
    const realMethods = result.functions.filter(f => shouldFind.some(name => f.name.includes(name)));
    
    console.log('False positives found:', falsePositives.map(item => item.name));
    console.log('Real methods found:', realMethods.map(f => f.name));
    
    return {
      noFalsePositives: falsePositives.length === 0,
      foundRealMethods: realMethods.length > 0,
      foundClass: result.classes.some(c => c.name === 'CommentedClass')
    };
  });

  // Test Python scenarios
  console.log('\n🐍 Testing Python Analysis');
  console.log('-'.repeat(40));

  await test('Python class and method detection', async () => {
    const result = await analyzer.analyzeFile(TEST_CASES.python.basic, 'test.py');
    
    console.log('Python functions:', result.functions.map(f => f.name));
    console.log('Python classes:', result.classes.map(c => c.name));
    
    // Should find class and methods including special methods
    const expectedMethods = ['__init__', 'get_user', '_fetch_data', 'create_default', 'validate_id'];
    const foundMethods = result.functions.filter(f => expectedMethods.includes(f.name));
    
    return {
      foundClass: result.classes.some(c => c.name === 'UserService'),
      foundPrivateMethod: result.functions.some(f => f.name === '_fetch_data'),
      foundAsyncMethod: result.functions.some(f => f.name === 'get_user' && f.isAsync),
      foundSpecialMethods: result.functions.some(f => f.name === '__init__'),
      foundDecorators: foundMethods.length >= 3
    };
  });

  // Test Java scenarios  
  console.log('\n☕ Testing Java Analysis');
  console.log('-'.repeat(40));

  await test('Java class and method detection', async () => {
    const result = await analyzer.analyzeFile(TEST_CASES.java.basic, 'Test.java');
    
    console.log('Java functions:', result.functions.map(f => f.name));
    console.log('Java classes:', result.classes.map(c => c.name));
    
    return {
      foundClass: result.classes.some(c => c.name === 'UserService'),
      foundInterface: result.classes.some(c => c.name === 'UserRepository'),
      foundEnum: result.classes.some(c => c.name === 'UserStatus'),
      foundPublicMethods: result.functions.some(f => f.name === 'getUser'),
      foundPrivateMethods: result.functions.some(f => f.name === 'fetchData'),
      foundConstructor: result.functions.some(f => f.name === 'UserService')
    };
  });

  // Test C# scenarios
  console.log('\n🔷 Testing C# Analysis');
  console.log('-'.repeat(40));

  await test('C# class and method detection', async () => {
    const result = await analyzer.analyzeFile(TEST_CASES.csharp.basic, 'Test.cs');
    
    console.log('C# functions:', result.functions.map(f => f.name));
    console.log('C# classes:', result.classes.map(c => c.name));
    
    return {
      foundClass: result.classes.some(c => c.name === 'UserService'),
      foundInterface: result.classes.some(c => c.name === 'IUserRepository'),
      foundEnum: result.classes.some(c => c.name === 'UserStatus'),
      foundAsyncMethods: result.functions.some(f => f.name === 'GetUserAsync'),
      foundProperties: result.functions.some(f => f.name === 'ApiKey'),
      foundStaticMethod: result.functions.some(f => f.name === 'GetInstance')
    };
  });

  // Overall robustness assessment
  console.log('\n🎯 Overall Robustness Assessment');
  console.log('-'.repeat(40));

  await test('Cross-language consistency', async () => {
    const results = {
      typescript: await analyzer.analyzeFile(TEST_CASES.typescript.basic, 'test.ts'),
      python: await analyzer.analyzeFile(TEST_CASES.python.basic, 'test.py'), 
      java: await analyzer.analyzeFile(TEST_CASES.java.basic, 'Test.java'),
      csharp: await analyzer.analyzeFile(TEST_CASES.csharp.basic, 'Test.cs')
    };
    
    // Each language should find at least one class and multiple methods
    const languageStats = Object.entries(results).map(([lang, result]) => ({
      language: lang,
      classes: result.classes.length,
      functions: result.functions.length,
      asyncFunctions: result.functions.filter(f => f.isAsync).length
    }));
    
    console.log('Language detection stats:');
    languageStats.forEach(stat => {
      console.log(`  ${stat.language}: ${stat.classes} classes, ${stat.functions} functions, ${stat.asyncFunctions} async`);
    });
    
    return {
      allLanguagesFoundClasses: languageStats.every(s => s.classes > 0),
      allLanguagesFoundFunctions: languageStats.every(s => s.functions > 0),
      totalClasses: languageStats.reduce((sum, s) => sum + s.classes, 0),
      totalFunctions: languageStats.reduce((sum, s) => sum + s.functions, 0)
    };
  });

  printResults();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCrossLanguageTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Cross-language test failed:', error);
      process.exit(1);
    });
}

export { runCrossLanguageTests };