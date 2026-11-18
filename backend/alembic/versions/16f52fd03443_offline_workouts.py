"""Track completed workout submissions and archive exercises."""

import sqlalchemy as sa
from alembic import op

revision = "16f52fd03443"
down_revision = "4f723d86ba19"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workout_sync_receipt",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payload_hash", sa.String(), nullable=False),
    )
    op.add_column("exercise", sa.Column("archived", sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    op.drop_column("exercise", "archived")
    op.drop_table("workout_sync_receipt")
