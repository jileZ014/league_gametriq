import os
from datetime import datetime
from crewai import Crew, Process
from agents import BasketballLeagueAgents
from tasks import BasketballLeagueTasks
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

class OutputCapture:
    def __init__(self, filename):
        self.terminal = sys.stdout
        self.log = open(filename, 'w', encoding='utf-8')
    
    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
    
    def flush(self):
        self.terminal.flush()
        self.log.flush()
    
    def close(self):
        self.log.close()

def main():
    print("🏀 Starting Basketball League Management App Research...")
    print("=" * 60)
    
    # Set up output capture
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    full_output_filename = f"basketball_research_FULL_{timestamp}.txt"
    sys.stdout = OutputCapture(full_output_filename)
    
    # Initialize agents
    agents = BasketballLeagueAgents()
    market_researcher = agents.market_researcher()
    ux_researcher = agents.ux_researcher()
    technical_architect = agents.technical_architect()
    feature_analyst = agents.feature_analyst()
    compliance_expert = agents.compliance_expert()
    business_strategist = agents.business_strategist()
    ui_designer = agents.ui_designer()  # NEW UI Designer
    
    # Initialize tasks
    tasks = BasketballLeagueTasks()
    
    # Create tasks
    market_research = tasks.market_research_task(market_researcher)
    user_research = tasks.user_research_task(ux_researcher)
    technical_requirements = tasks.technical_requirements_task(technical_architect)
    compliance_review = tasks.compliance_review_task(compliance_expert)
    
    # Tasks with context dependencies
    feature_prioritization = tasks.feature_prioritization_task(
        feature_analyst,
        context=[market_research, user_research, technical_requirements]
    )
    
    # UI Design task with UX context
    ui_design = tasks.ui_design_task(
        ui_designer,
        context=[user_research, feature_prioritization]
    )
    
    business_model = tasks.business_model_task(
        business_strategist,
        context=[market_research, user_research, feature_prioritization]
    )
    
    # Store all tasks for output collection
    all_tasks = [
        market_research,
        user_research,
        technical_requirements,
        compliance_review,
        feature_prioritization,
        ui_design,  # NEW task
        business_model
    ]
    
    # Create crew
    crew = Crew(
        agents=[
            market_researcher,
            ux_researcher,
            technical_architect,
            compliance_expert,
            feature_analyst,
            ui_designer,  # NEW agent
            business_strategist
        ],
        tasks=all_tasks,
        process=Process.sequential,
        verbose=True,
        full_output=True
    )
    
    # Execute the crew
    print("\n🚀 Executing research crew with UI Designer... This may take 12-18 minutes.")
    print(f"📝 Full output is being saved to: {full_output_filename}\n")
    
    try:
        result = crew.kickoff()
        
        # Create comprehensive markdown report
        markdown_filename = f"basketball_league_COMPLETE_research_{timestamp}.md"
        with open(markdown_filename, "w", encoding="utf-8") as f:
            f.write("# Basketball League Management App - Complete Research Report\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("=" * 80 + "\n\n")
            f.write("## Table of Contents\n\n")
            f.write("1. [Market Research Analysis](#1-market-research-analysis)\n")
            f.write("2. [User Research & Personas](#2-user-research--personas)\n")
            f.write("3. [Technical Architecture](#3-technical-architecture)\n")
            f.write("4. [Compliance & Safety Requirements](#4-compliance--safety-requirements)\n")
            f.write("5. [Feature Prioritization](#5-feature-prioritization)\n")
            f.write("6. [UI Design System](#6-ui-design-system)\n")
            f.write("7. [Business Model & Monetization](#7-business-model--monetization)\n\n")
            f.write("=" * 80 + "\n\n")
            
            # Try to get individual task outputs
            f.write("## 1. Market Research Analysis\n\n")
            if hasattr(market_research, 'output') and market_research.output:
                f.write(str(market_research.output) + "\n\n")
            else:
                f.write("*Market research output not captured - check full log file*\n\n")
            
            f.write("=" * 80 + "\n\n")
            f.write("## 2. User Research & Personas\n\n")
            if hasattr(user_research, 'output') and user_research.output:
                f.write(str(user_research.output) + "\n\n")
            else:
                f.write("*User research output not captured - check full log file*\n\n")
            
            f.write("=" * 80 + "\n\n")
            f.write("## 3. Technical Architecture\n\n")
            if hasattr(technical_requirements, 'output') and technical_requirements.output:
                f.write(str(technical_requirements.output) + "\n\n")
            else:
                f.write("*Technical architecture output not captured - check full log file*\n\n")
            
            f.write("=" * 80 + "\n\n")
            f.write("## 4. Compliance & Safety Requirements\n\n")
            if hasattr(compliance_review, 'output') and compliance_review.output:
                f.write(str(compliance_review.output) + "\n\n")
            else:
                f.write("*Compliance output not captured - check full log file*\n\n")
            
            f.write("=" * 80 + "\n\n")
            f.write("## 5. Feature Prioritization\n\n")
            if hasattr(feature_prioritization, 'output') and feature_prioritization.output:
                f.write(str(feature_prioritization.output) + "\n\n")
            else:
                f.write("*Feature prioritization output not captured - check full log file*\n\n")
            
            f.write("=" * 80 + "\n\n")
            f.write("## 6. UI Design System\n\n")
            if hasattr(ui_design, 'output') and ui_design.output:
                f.write(str(ui_design.output) + "\n\n")
            else:
                f.write("*UI design output not captured - check full log file*\n\n")
            
            f.write("=" * 80 + "\n\n")
            f.write("## 7. Business Model & Monetization\n\n")
            if result:
                f.write(str(result) + "\n\n")
            else:
                f.write("*Business model output not captured - check full log file*\n\n")
            
            f.write("=" * 80 + "\n\n")
            f.write("## End of Report\n\n")
            f.write(f"For complete details including agent reasoning, see: {full_output_filename}\n")
        
        print("\n" + "=" * 60)
        print(f"✅ Research completed with UI Design!")
        print(f"📄 Complete Markdown report: {markdown_filename}")
        print(f"📝 Full output log: {full_output_filename}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error occurred: {str(e)}")
        print("Partial results may have been saved.")
    finally:
        # Restore normal output
        sys.stdout.close()
        sys.stdout = sys.__stdout__
    
    return result

if __name__ == "__main__":
    main()