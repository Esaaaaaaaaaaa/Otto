import AddMockExam from './pages/AddMockExam';
import AddMockQuestion from './pages/AddMockQuestion';
import AddQuestion from './pages/AddQuestion';
import AdminAnalytics from './pages/AdminAnalytics';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import MockAnalytics from './pages/MockAnalytics';
import MockExamPractice from './pages/MockExamPractice';
import MockExams from './pages/MockExams';
import PracticeSet from './pages/PracticeSet';
import Questions from './pages/Questions';
import ReportedQuestions from './pages/ReportedQuestions';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddMockExam": AddMockExam,
    "AddMockQuestion": AddMockQuestion,
    "AddQuestion": AddQuestion,
    "AdminAnalytics": AdminAnalytics,
    "Dashboard": Dashboard,
    "ManageUsers": ManageUsers,
    "MockAnalytics": MockAnalytics,
    "MockExamPractice": MockExamPractice,
    "MockExams": MockExams,
    "PracticeSet": PracticeSet,
    "Questions": Questions,
    "ReportedQuestions": ReportedQuestions,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};