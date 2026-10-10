import os
import tempfile

os.environ["GENTLECHECK_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")
