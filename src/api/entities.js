import { supabase } from '@/lib/supabase';

// Map PascalCase entity names to snake_case table names
const tableNameMap = {
  Question: 'questions',
  Year: 'years',
  Module: 'modules',
  Submodule: 'submodules',
  User: 'users',
  UserQuestionProgress: 'user_question_progress',
  UserPracticeProgress: 'user_practice_progress',
  UserMockExamAttempt: 'user_mock_exam_attempts',
  UserMockExamAnswer: 'user_mock_exam_answers',
  MockExam: 'mock_exams',
  MockExamQuestion: 'mock_exam_questions',
  QuestionAttempt: 'question_attempts',
  QuestionReport: 'question_reports',
  MockExamFeedback: 'mock_exam_feedback',
};

// Convert PascalCase field names to snake_case for Supabase
const toSnakeCase = (str) => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
};

// Convert snake_case field names to camelCase for frontend
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Transform object keys from snake_case to camelCase
const transformKeysToCamelCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToCamelCase);
  }
  if (typeof obj === 'object') {
    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
      transformed[toCamelCase(key)] = transformKeysToCamelCase(value);
    }
    return transformed;
  }
  return obj;
};

// Transform object keys from camelCase to snake_case
const transformKeysToSnakeCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToSnakeCase);
  }
  if (typeof obj === 'object') {
    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
      transformed[toSnakeCase(key)] = transformKeysToSnakeCase(value);
    }
    return transformed;
  }
  return obj;
};

// Create an entity helper for a given table
const createEntityHelper = (entityName) => {
  const tableName = tableNameMap[entityName] || toSnakeCase(entityName);

  return {
    // Fetch all records
    async list() {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;
      return transformKeysToCamelCase(data);
    },

    // Filter records by conditions
    async filter(conditions) {
      let query = supabase.from(tableName).select('*');

      // Apply filters
      const snakeCaseConditions = transformKeysToSnakeCase(conditions);
      for (const [key, value] of Object.entries(snakeCaseConditions)) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return transformKeysToCamelCase(data);
    },

    // Create a new record
    async create(record) {
      const snakeCaseRecord = transformKeysToSnakeCase(record);
      const { data, error } = await supabase
        .from(tableName)
        .insert(snakeCaseRecord)
        .select()
        .single();

      if (error) throw error;
      return transformKeysToCamelCase(data);
    },

    // Update a record by ID
    async update(id, updates) {
      const snakeCaseUpdates = transformKeysToSnakeCase(updates);
      const { data, error } = await supabase
        .from(tableName)
        .update(snakeCaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformKeysToCamelCase(data);
    },

    // Delete a record by ID
    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    },

    // Get a single record by ID
    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return transformKeysToCamelCase(data);
    },
  };
};

// Create entity proxies for all known entities
export const Question = createEntityHelper('Question');
export const Year = createEntityHelper('Year');
export const Module = createEntityHelper('Module');
export const Submodule = createEntityHelper('Submodule');
export const User = createEntityHelper('User');
export const UserQuestionProgress = createEntityHelper('UserQuestionProgress');
export const UserPracticeProgress = createEntityHelper('UserPracticeProgress');
export const UserMockExamAttempt = createEntityHelper('UserMockExamAttempt');
export const UserMockExamAnswer = createEntityHelper('UserMockExamAnswer');
export const MockExam = createEntityHelper('MockExam');
export const MockExamQuestion = createEntityHelper('MockExamQuestion');
export const QuestionAttempt = createEntityHelper('QuestionAttempt');
export const QuestionReport = createEntityHelper('QuestionReport');
export const MockExamFeedback = createEntityHelper('MockExamFeedback');

// Export the supabase client for direct access when needed
export { supabase };
