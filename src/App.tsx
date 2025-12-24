
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CourseLessons from "./pages/CourseLessons";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { usePageTracker } from "./hooks/usePageTracker";
import { useEffect } from "react";
import ProtectionLoader from "@/components/ProtectionLoader";

// Pages
import Launcher from "./pages/Launcher";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import CourseModules from "./pages/CourseModules";
import CourseVideo from "./pages/CourseVideo";
import Subscription from "./pages/Subscription";
import Affiliate from "./pages/Affiliate";
import Settings from "./pages/Settings";
import AddUser from "./pages/AddUser";
import ManageUsers from "./pages/ManageUsers";
import EditUser from "./pages/EditUser";
import ManagingContent from "./pages/ManagingContent";
import Admin from "./pages/Admin";
import AddCourse from "./pages/AddCourse";
import EditCourse from "./pages/EditCourse";
import AddModule from "./pages/AddModule";
import EditModule from "./pages/EditModule";
import AddLesson from "./pages/AddLesson";
import AddLessonBulk from "./pages/AddLessonBulk";
import EditLesson from "./pages/EditLesson";
import DailyMotivation from "./pages/DailyMotivation";
import AddDailyMotivation from "./pages/AddDailyMotivation";
import MonitorStudents from "./pages/MonitorStudents";
import StudentActivity from "./pages/StudentActivity";
import AllComments from "./pages/AllComments";
import ProfitDashboard from "./pages/ProfitDashboard";
import AddProfit from "./pages/AddProfit";
import EditProfit from "./pages/EditProfit";
import NotFound from "./pages/NotFound";
import Jail from "./pages/Jail";
import Support from "./pages/Support";
import CustomerSupport from "./pages/CustomerSupport";
import CheckEmail from "./pages/CheckEmail";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isMembershipExpired } = useAuth();
  
  // Initialize page tracker for automatic page visit tracking
  usePageTracker();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-2xl font-bold text-gold">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to jail page if membership is expired
  // Allow access to subscription page even with expired membership
  if (isMembershipExpired) {
    return <Navigate to="/jail" replace />;
  }
  
  return <>{children}</>;
};

// Jail Route Component
const JailRoute = () => {
  const { user, loading, isMembershipExpired } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-2xl font-bold text-gold">Loading...</div>
      </div>
    );
  }
  
  // Redirect unauthenticated users to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect users with valid memberships to home
  if (!isMembershipExpired) {
    return <Navigate to="/home" replace />;
  }
  
  // Only show Jail page to authenticated users with expired memberships
  return <Jail />;
};

// const RTLProvider = ({ children }: { children: React.ReactNode }) => {
//   useEffect(() => {
//     document.documentElement.dir = 'rtl';
//     document.body.classList.add('rtl');
    
//     return () => {
//       document.documentElement.dir = 'ltr';
//       document.body.classList.remove('rtl');
//     };
//   }, []);
  
//   return <>{children}</>;
// };

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
          <Toaster />
          <Sonner />
          <ProtectionLoader />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Launcher />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/check-email" element={<CheckEmail />} />
              <Route 
                path="/home" 
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/courses" 
                element={
                  <ProtectedRoute>
                    <Courses />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/course/:courseId" 
                element={
                  <ProtectedRoute>
                    <CourseModules />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/course/:courseId/module/:moduleId" 
                element={
                  <ProtectedRoute>
                    <CourseLessons />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/course/:courseId/module/:moduleId/lesson/:lessonId" 
                element={
                  <ProtectedRoute>
                    <CourseVideo />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/subscription" 
                element={
                  <ProtectedRoute>
                    <Subscription />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/affiliate" 
                element={
                  <ProtectedRoute>
                    <Affiliate />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/daily-motivation" 
                element={
                  <ProtectedRoute>
                    <DailyMotivation />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/add-student" 
                element={
                  <ProtectedRoute>
                    <AddUser />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/manage-students" 
                element={
                  <ProtectedRoute>
                    <ManageUsers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/edit-user/:userId" 
                element={
                  <ProtectedRoute>
                    <EditUser />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/manage-content" 
                element={
                  <ProtectedRoute>
                    <ManagingContent />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/add-course" 
                element={
                  <ProtectedRoute>
                    <AddCourse />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/course/:courseId/edit" 
                element={
                  <ProtectedRoute>
                    <EditCourse />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/course/:courseId/add-module" 
                element={
                  <ProtectedRoute>
                    <AddModule />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/course/:courseId/module/:moduleId/edit" 
                element={
                  <ProtectedRoute>
                    <EditModule />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/course/:courseId/module/:moduleId/add-lesson" 
                element={
                  <ProtectedRoute>
                    <AddLesson />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/course/:courseId/module/:moduleId/add-lesson-bulk" 
                element={
                  <ProtectedRoute>
                    <AddLessonBulk />
                  </ProtectedRoute>
                } 
              />              
              <Route 
                path="/admin/course/:courseId/module/:moduleId/lesson/:lessonId/edit" 
                element={
                  <ProtectedRoute>
                    <EditLesson />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/add-daily-motivation" 
                element={
                  <ProtectedRoute>
                    <AddDailyMotivation />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/monitor-students" 
                element={
                  <ProtectedRoute>
                    <MonitorStudents />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/monitor-students/:userId" 
                element={
                  <ProtectedRoute>
                    <StudentActivity />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/all-comments" 
                element={
                  <ProtectedRoute>
                    <AllComments />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/profit-dashboard" 
                element={
                  <ProtectedRoute>
                    <ProfitDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/add-profit" 
                element={
                  <ProtectedRoute>
                    <AddProfit />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/edit-profit/:id" 
                element={
                  <ProtectedRoute>
                    <EditProfit />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/support" 
                element={
                  <ProtectedRoute>
                    <Support />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/customer-support" 
                element={
                  <ProtectedRoute>
                    <CustomerSupport />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/jail" 
                element={
                  <JailRoute />
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
