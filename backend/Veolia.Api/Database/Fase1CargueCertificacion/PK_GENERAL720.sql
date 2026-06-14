-- Stub de PK_GENERAL720 (dependencia de PK_CERTIFICACION y PK_GIRS)
CREATE OR REPLACE PACKAGE PK_GENERAL720 AS
    TYPE tind_emprdivirell IS RECORD (
        lint_empresa    INTEGER,
        lint_relleno    INTEGER,
        lint_mpio       INTEGER
    );

    FUNCTION fauco_getdataps(aps INTEGER) RETURN tind_emprdivirell;
    FUNCTION fauco_getpromedlbl(empresa NUMBER, mpio NUMBER, anno NUMBER, semestre NUMBER) RETURN NUMBER;
END PK_GENERAL720;
/

CREATE OR REPLACE PACKAGE BODY PK_GENERAL720 AS
    FUNCTION fauco_getdataps(aps INTEGER) RETURN tind_emprdivirell IS
        lrec tind_emprdivirell;
    BEGIN
        -- Stub: retorna valores demo basados en APS
        lrec.lint_empresa := 1;
        lrec.lint_relleno := 1;
        lrec.lint_mpio := 1;
        RETURN lrec;
    END;

    FUNCTION fauco_getpromedlbl(empresa NUMBER, mpio NUMBER, anno NUMBER, semestre NUMBER) RETURN NUMBER IS
    BEGIN
        RETURN 0;
    END;
END PK_GENERAL720;
/
