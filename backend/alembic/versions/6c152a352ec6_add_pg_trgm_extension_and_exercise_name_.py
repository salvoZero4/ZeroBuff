"""add pg_trgm extension and exercise name index

Revision ID: 6c152a352ec6
Revises: 81884526fb38
Create Date: 2026-09-04 11:56:03.465204

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6c152a352ec6"
down_revision: Union[str, Sequence[str], None] = "81884526fb38"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX ix_exercise_name_trgm ON exercise USING gin (name gin_trgm_ops)"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS ix_exercise_name_trgm")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
