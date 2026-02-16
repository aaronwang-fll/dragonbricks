from fastapi import APIRouter

from app.api import auth, llm, parser, programs, teams, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(programs.router, prefix="/programs", tags=["programs"])
api_router.include_router(llm.router, prefix="/llm", tags=["llm"])
api_router.include_router(parser.router, prefix="/parser", tags=["parser"])
