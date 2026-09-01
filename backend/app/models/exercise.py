from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field
from enum import Enum

class MuscleGroup(str, Enum):
    chest = "chest"
    
   
    lats = "lats"               
    upper_back = "upper_back"   
    lower_back = "lower_back"    
    
    front_delts = "front_delts" 
    side_delts = "side_delts"    
    rear_delts = "rear_delts"    
    
   
    biceps = "biceps"
    triceps = "triceps"
    forearms = "forearms"
    
 
    quads = "quads"               
    hamstrings = "hamstrings"    
    glutes = "glutes"             
    calves = "calves"            
    adductors = "adductors"       
    abductors = "abductors"       
    
 
    abs = "abs"
    obliques = "obliques"
    
    # Altro
    traps = "traps"              
    neck = "neck"
    full_body = "full_body"

class Exercise(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, 
        primary_key=True, index=True, 
        unique=True, 
        nullable=False)
    name: str = Field(index=True, unique=True)
    muscle_group: str = Field(index=True)
    created_by_user: str #username of the user who created the exercise
