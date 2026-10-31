"""added ondelete cascade to set_log session_id

Revision ID: 3d0dd87c2cd1
Revises: 04c5e9cf402b
Create Date: 2026-10-31 15:03:54.643473

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '3d0dd87c2cd1'
down_revision: Union[str, Sequence[str], None] = '04c5e9cf402b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(
        op.f("set_log_session_id_fkey"), "set_log", type_="foreignkey"
    )
    op.create_foreign_key(
        op.f("set_log_session_id_fkey"),
        "set_log",
        "session",
        ["session_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f("set_log_session_id_fkey"), "set_log", type_="foreignkey"
    )
    op.create_foreign_key(
        op.f("set_log_session_id_fkey"),
        "set_log",
        "session",
        ["session_id"],
        ["id"],
    )
