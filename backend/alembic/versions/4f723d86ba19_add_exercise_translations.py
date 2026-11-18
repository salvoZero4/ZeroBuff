"""Add exercise translations."""

import sqlalchemy as sa
from alembic import op

revision = "4f723d86ba19"
down_revision = "3d0dd87c2cd1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "exercise_translation",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("language", sa.String(63), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercise.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("exercise_id", "language", name="uq_exercise_translation_language"),
    )
    op.create_index(
        "ix_exercise_translation_name_trgm",
        "exercise_translation",
        ["name"],
        postgresql_using="gin",
        postgresql_ops={"name": "gin_trgm_ops"},
    )


def downgrade() -> None:
    op.drop_table("exercise_translation")
