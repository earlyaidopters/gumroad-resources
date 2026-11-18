"""Native Heretic MPOA with three predeclared strengths for missing-fact behavior."""
from heretic.modifiers.abliteration import Abliteration, Parameters, WeightDistribution

class ClarificationMPOA(Abliteration):
    def suggest_parameters(self, ctx, trial):
        scale = [0.5, 1.0, 1.5][trial.number % 3]
        trial.set_user_attr("declared_scale", scale)
        return Parameters(direction_index=24.0, weight_distributions={
            "attn.o_proj": WeightDistribution(3.0 * scale, 23.0, 1.0 * scale, 9.0),
            "mlp.down_proj": WeightDistribution(1.5 * scale, 24.0, 0.3 * scale, 8.0),
        })
