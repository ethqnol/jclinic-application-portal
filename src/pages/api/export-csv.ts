import type { APIRoute } from "astro";
import { requireAdminGuard } from "../../lib/auth-guards";
import { errorResponse } from "../../lib/api-response";
import { AdminService } from "../../lib/services/adminService";

function sanitizeCSVCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Neutralize formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // Escape double quotes
  return `"${str.replace(/"/g, '""')}"`;
}

export const GET: APIRoute = async (context) => {
  const guard = await requireAdminGuard(context);
  if (!guard) {
    return errorResponse("Unauthorized", 403);
  }

  try {
    const applications = await AdminService.getAllApplications(guard.db);

    if (!applications || applications.length === 0) {
      return new Response("No applications found", { status: 404 });
    }

    const headers = [
      "Application ID",
      "First Name",
      "Last Name",
      "Google Email",
      "Preferred Email",
      "Parent Name",
      "Parent Email",
      "Parent Phone",
      "Submitted Date",
      "Rating (1-5)",
      "Student Location",
      "Grade Level",
      "Programming Experience",
      "Languages Used",
      "ML Technologies Used",
      "Research Experience",
      "Financial Aid Needed",
      "Recommender Name",
      "Recommender Email",
      "Recommender Title",
      "Rec Letter Status",
      "Rec Letter Suspicious Flag",
      "Rec Letter Text",
      "Clubs & Activities",
      "Final Thoughts",
      "Essay 1 (Interests & Background)",
      "Essay 2 (Future Goals)",
    ];

    let csvContent = headers.join(",") + "\n";

    applications.forEach((app: any) => {
      let experienceData: any = {};
      try {
        experienceData = JSON.parse(app.experience_data || "{}");
      } catch (e) {
        experienceData = {};
      }

      const locDetail = experienceData.location_detail;
      let displayLoc = 'Massachusetts';
      if (app.student_location === 'out_of_state') {
        displayLoc = locDetail ? `Out of State (${locDetail})` : 'Out of State (US)';
      } else if (app.student_location === 'international') {
        displayLoc = locDetail ? `International (${locDetail})` : 'International';
      }

      const recStatus = app.rec_is_submitted ? "Received ✓" : "Pending";
      const recFlag = app.is_suspicious_submission === 1 ? "FLAGGED: Device/Session Match" : (app.is_personal_email === 1 ? "NOTICE: Personal Email" : "Normal");

      const row = [
        app.id,
        sanitizeCSVCell(app.first_name),
        sanitizeCSVCell(app.last_name),
        sanitizeCSVCell(app.user_email),
        sanitizeCSVCell(app.preferred_email),
        sanitizeCSVCell(experienceData.parent_name),
        sanitizeCSVCell(experienceData.parent_email),
        sanitizeCSVCell(experienceData.parent_phone),
        sanitizeCSVCell(new Date(app.submitted_at).toLocaleDateString()),
        sanitizeCSVCell(app.reviewer_grade ? `${app.reviewer_grade}/5` : "Unrated"),
        sanitizeCSVCell(displayLoc),
        sanitizeCSVCell(experienceData.grade_level || experienceData.academic_year),
        sanitizeCSVCell(experienceData.programming_experience),
        sanitizeCSVCell(experienceData.languages?.join(", ") || "None"),
        sanitizeCSVCell(experienceData.ml_technologies?.join(", ") || "None"),
        sanitizeCSVCell(experienceData.research_experience),
        sanitizeCSVCell(app.needs_financial_aid ? "Yes" : "No"),
        sanitizeCSVCell(app.recommender_name || experienceData.recommender_name),
        sanitizeCSVCell(app.recommender_email || experienceData.recommender_email),
        sanitizeCSVCell(app.recommender_title || experienceData.recommender_title),
        sanitizeCSVCell(recStatus),
        sanitizeCSVCell(recFlag),
        sanitizeCSVCell(app.letter_text || ""),
        sanitizeCSVCell(experienceData.clubs_activities),
        sanitizeCSVCell(experienceData.final_thoughts),
        sanitizeCSVCell(app.essay_one),
        sanitizeCSVCell(app.essay_two),
      ];
      csvContent += row.join(",") + "\n";
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="applications-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return errorResponse("Internal server error", 500);
  }
};
